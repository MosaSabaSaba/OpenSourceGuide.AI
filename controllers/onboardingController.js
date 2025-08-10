import githubService from '../services/githubService.js';
import groqService from '../services/groqService.js';

/**
 * Parses GitHub repository URL to extract owner and repo name
 * @param {string} repoUrl - GitHub repository URL
 * @returns {Object|null} - Object with owner and repo properties, or null if invalid
 */
function parseGitHubUrl(repoUrl) {
    try {
        // Handle different URL formats that users might provide
        let cleanUrl = repoUrl.trim();
        
        // Remove trailing .git if present
        if (cleanUrl.endsWith('.git')) {
            cleanUrl = cleanUrl.slice(0, -4);
        }
        
        // Remove trailing slash if present
        if (cleanUrl.endsWith('/')) {
            cleanUrl = cleanUrl.slice(0, -1);
        }
        
        // Handle different GitHub URL formats
        const githubPatterns = [
            // Standard HTTPS URLs
            /^https?:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)(?:\/.*)?$/,
            // SSH URLs
            /^git@github\.com:([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)(?:\.git)?$/,
            // Short format (owner/repo)
            /^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)$/
        ];
        
        for (const pattern of githubPatterns) {
            const match = cleanUrl.match(pattern);
            if (match) {
                const [, owner, repo] = match;
                
                // Validate that owner and repo follow GitHub naming conventions
                const validNamePattern = /^[a-zA-Z0-9._-]+$/;
                if (!validNamePattern.test(owner) || !validNamePattern.test(repo)) {
                    return null;
                }
                
                // Additional validation: names can't start with dots or hyphens
                if (owner.startsWith('.') || owner.startsWith('-') || 
                    repo.startsWith('.') || repo.startsWith('-')) {
                    return null;
                }
                
                return { owner, repo };
            }
        }
        
        return null;
        
    } catch (error) {
        console.warn('Error parsing GitHub URL:', error.message);
        return null;
    }
}

/**
 * Analyzes a GitHub repository and generates AI-powered insights
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function analyzeRepository(req, res) {
    try {
        const { repoUrl } = req.body;
        
        // Validate input
        if (!repoUrl || typeof repoUrl !== 'string') {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'repoUrl is required and must be a string'
            });
        }
        
        // Parse GitHub URL with improved validation
        const parsedRepo = parseGitHubUrl(repoUrl);
        if (!parsedRepo) {
            return res.status(400).json({
                error: 'Invalid GitHub URL',
                message: 'Please provide a valid GitHub repository URL (e.g., https://github.com/owner/repo, git@github.com:owner/repo.git, or owner/repo)'
            });
        }
        
        const { owner, repo } = parsedRepo;
        
        // Fetch data from GitHub API
        console.log(`Analyzing repository: ${owner}/${repo}`);
        
        const [repoData, issues, readmeContent, contributingContent, codeOfConductContent] = await Promise.allSettled([
            githubService.getRepositoryMetadata(owner, repo),
            githubService.getBeginnerFriendlyIssues(owner, repo),
            githubService.getFileContent(owner, repo, 'README.md'),
            githubService.getFileContent(owner, repo, 'CONTRIBUTING.md'),
            githubService.getFileContent(owner, repo, 'CODE_OF_CONDUCT.md')
        ]);
        
        // Handle GitHub API errors with more specific messaging
        if (repoData.status === 'rejected') {
            console.error('Failed to fetch repository metadata:', repoData.reason);
            
            // Provide more specific error messages based on the error
            if (repoData.reason.message.includes('Resource not found')) {
                return res.status(404).json({
                    error: 'Repository not found',
                    message: `The repository '${owner}/${repo}' was not found. Please check that the repository exists and is publicly accessible.`
                });
            } else if (repoData.reason.message.includes('rate limit')) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: 'GitHub API rate limit exceeded. Please try again later or configure a GitHub token for higher limits.'
                });
            } else if (repoData.reason.message.includes('authentication')) {
                return res.status(401).json({
                    error: 'Authentication failed',
                    message: 'GitHub API authentication failed. Please check your GitHub token configuration.'
                });
            } else {
                return res.status(500).json({
                    error: 'GitHub API error',
                    message: 'Could not fetch repository information. Please try again later.'
                });
            }
        }
        
        // Build context for AI prompts
        const context = {
            repo: repoData.value,
            issues: issues.status === 'fulfilled' ? issues.value : [],
            readme: readmeContent.status === 'fulfilled' ? readmeContent.value : null,
            contributing: contributingContent.status === 'fulfilled' ? contributingContent.value : null,
            codeOfConduct: codeOfConductContent.status === 'fulfilled' ? codeOfConductContent.value : null
        };
        
        // Generate AI insights using Groq
        console.log('Generating AI insights using Groq...');
        const [startAnalysis, improvingAnalysis, rulesAnalysis, aboutAnalysis] = await Promise.allSettled([
            groqService.analyzeWhereToStart(context),
            groqService.analyzeWhatNeedsImproving(context),
            groqService.analyzeContributionRules(context),
            groqService.analyzeProjectOverview(context)
        ]);
        
        // Build response
        const response = {
            repository: {
                name: repoData.value.name,
                fullName: repoData.value.full_name,
                description: repoData.value.description,
                url: repoData.value.html_url
            },
            analysis: {
                whereToStart: startAnalysis.status === 'fulfilled' ? startAnalysis.value : 'Unable to analyze beginner-friendly opportunities at this time.',
                whatNeedsImproving: improvingAnalysis.status === 'fulfilled' ? improvingAnalysis.value : 'Unable to identify improvement areas at this time.',
                contributionRules: rulesAnalysis.status === 'fulfilled' ? rulesAnalysis.value : 'Unable to summarize contribution guidelines at this time.',
                projectOverview: aboutAnalysis.status === 'fulfilled' ? aboutAnalysis.value : 'Unable to generate project overview at this time.'
            },
            metadata: {
                analyzedAt: new Date().toISOString(),
                issuesFound: context.issues.length,
                hasReadme: !!context.readme,
                hasContributing: !!context.contributing,
                hasCodeOfConduct: !!context.codeOfConduct,
                apiStatus: {
                    github: process.env.GITHUB_TOKEN ? 'Authenticated' : 'Unauthenticated',
                    groq: process.env.GROQ_API_KEY ? 'Active' : 'Inactive'
                }
            }
        };
        
        // Log any AI analysis failures
        [startAnalysis, improvingAnalysis, rulesAnalysis, aboutAnalysis].forEach((result, index) => {
            const analysisNames = ['whereToStart', 'whatNeedsImproving', 'contributionRules', 'projectOverview'];
            if (result.status === 'rejected') {
                console.error(`Failed to generate ${analysisNames[index]} analysis:`, result.reason);
            }
        });
        
        res.json(response);
        
    } catch (error) {
        console.error('Unexpected error in analyzeRepository:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'An unexpected error occurred while analyzing the repository.'
        });
    }
}

export default { analyzeRepository, parseGitHubUrl };