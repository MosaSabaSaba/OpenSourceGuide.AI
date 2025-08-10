import fetch from 'node-fetch';
console.log('Groq API Key from env:', process.env.GROQ_API_KEY ? 'Exists' : 'Missing');
console.log('Current environment:', process.env.NODE_ENV);
class GroqService {
    constructor() {
        this.baseURL = 'https://api.groq.com/openai/v1';
        this.model = 'llama3-70b-8192';
        // Hardcoded API key 
        // this.apiKey = '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';
        
        if (!process.env.GROQ_API_KEY) {
            console.warn('GROQ_API_KEY not found in environment variables');
        }
        
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };
        
        // Rate limit tracking for Groq free tier
        this.rateLimit = {
            requestsPerMinute: 30,
            tokensPerMinute: 6000,
            requestCount: 0,
            tokenCount: 0,
            windowStart: Date.now()
        };
        
        console.log(`Using Groq API with model: ${this.model}`);
    }
    
    /**
     * Checks and updates rate limit tracking
     */
    checkRateLimit() {
        const now = Date.now();
        const windowDuration = 60000; // 1 minute
        
        // Reset counters if window has passed
        if (now - this.rateLimit.windowStart > windowDuration) {
            this.rateLimit.requestCount = 0;
            this.rateLimit.tokenCount = 0;
            this.rateLimit.windowStart = now;
        }
        
        // Warn if approaching limits
        if (this.rateLimit.requestCount >= 25) {
            console.warn(`Groq rate limit warning: ${this.rateLimit.requestCount}/30 requests used this minute`);
        }
    }
    
    /**
     * Makes a request to Groq API
     * @param {string} prompt - The prompt to send
     * @param {number} maxTokens - Maximum tokens in response
     * @returns {Promise<string>} - AI response
     */
    async makeRequest(prompt, maxTokens = 500) {
        if (!process.env.GROQ_API_KEY) {
            throw new Error('Groq API key is not configured. Please set GROQ_API_KEY environment variable.');
        }
        
        this.checkRateLimit();
        
        const payload = {
            model: this.model,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: maxTokens,
            temperature: 0.7,
            top_p: 0.9,
            stream: false
        };
        
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                
                if (response.status === 429) {
                    throw new Error('Groq API rate limit exceeded. Please wait a moment and try again.');
                } else if (response.status === 401) {
                    throw new Error('Groq API authentication failed. Please check your API key.');
                } else {
                    throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorData}`);
                }
            }
            
            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Unexpected response format from Groq API');
            }
            
            // Update rate limit tracking
            this.rateLimit.requestCount++;
            if (data.usage) {
                this.rateLimit.tokenCount += (data.usage.prompt_tokens || 0) + (data.usage.completion_tokens || 0);
            }
            
            return data.choices[0].message.content.trim();
            
        } catch (error) {
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                throw new Error('Unable to connect to Groq API. Check your internet connection.');
            }
            throw error;
        }
    }
    
    /**
     * Gets current rate limit status
     * @returns {Object} - Rate limit information
     */
    getRateLimitStatus() {
        const now = Date.now();
        const windowDuration = 60000; // 1 minute
        const timeUntilReset = Math.max(0, windowDuration - (now - this.rateLimit.windowStart));
        
        return {
            requestsRemaining: Math.max(0, this.rateLimit.requestsPerMinute - this.rateLimit.requestCount),
            requestsUsed: this.rateLimit.requestCount,
            requestsLimit: this.rateLimit.requestsPerMinute,
            tokensUsed: this.rateLimit.tokenCount,
            tokensLimit: this.rateLimit.tokensPerMinute,
            windowResetIn: Math.ceil(timeUntilReset / 1000) // seconds
        };
    }

    /**
     * Analyzes where beginners can start contributing
     * @param {Object} context - Repository context data
     * @returns {Promise<string>} - Analysis result
     */
    async analyzeWhereToStart(context) {
        const { repo, issues } = context;
        
        let prompt = `You are analyzing the GitHub repository "${repo.full_name}" to help beginners find good starting points for contribution.

Repository Description: ${repo.description || 'No description available'}
Language: ${repo.language || 'Not specified'}
Stars: ${repo.stargazers_count}
Open Issues: ${repo.open_issues_count}

`;
        
        if (issues.length > 0) {
            prompt += `Beginner-friendly issues found (${issues.length}):\n`;
            issues.slice(0, 5).forEach((issue, index) => {
                prompt += `${index + 1}. "${issue.title}" - ${issue.html_url}\n`;
                if (issue.labels && issue.labels.length > 0) {
                    prompt += `   Labels: ${issue.labels.map(l => l.name).join(', ')}\n`;
                }
            });
            prompt += '\n';
        } else {
            prompt += 'No beginner-friendly issues found with typical labels (good first issue, help wanted, etc.)\n\n';
        }
        
        prompt += `Please provide specific, actionable advice for beginners wanting to contribute to this repository. Include:
1. Concrete next steps they should take
2. What skills or knowledge would be helpful
3. How to get started even without labeled issues
4. Any patterns you notice from the repository structure

Keep the response practical and encouraging. Format as HTML with appropriate tags for better presentation.`;
        
        return await this.makeRequest(prompt, 600);
    }
    
    /**
     * Analyzes what needs improving in the repository
     * @param {Object} context - Repository context data
     * @returns {Promise<string>} - Analysis result
     */
    async analyzeWhatNeedsImproving(context) {
        const { repo, readme, contributing, codeOfConduct } = context;
        
        let prompt = `You are analyzing the GitHub repository "${repo.full_name}" to identify areas that need improvement.

Repository Info:
- Description: ${repo.description || 'No description'}
- Language: ${repo.language || 'Not specified'}
- Last updated: ${repo.updated_at}
- Has README: ${readme ? 'Yes' : 'No'}
- Has CONTRIBUTING.md: ${contributing ? 'Yes' : 'No'}
- Has CODE_OF_CONDUCT.md: ${codeOfConduct ? 'Yes' : 'No'}
- Open issues: ${repo.open_issues_count}
- Forks: ${repo.forks_count}

`;
        
        if (readme) {
            const readmeLength = readme.length;
            prompt += `README.md analysis:
- Length: ${readmeLength} characters
- ${readmeLength < 500 ? 'Quite short' : readmeLength > 2000 ? 'Comprehensive' : 'Moderate length'}
- First 200 chars: "${readme.substring(0, 200).replace(/\n/g, ' ')}..."

`;
        }
        
        prompt += `Based on this information, identify specific areas that need improvement. Consider:
1. Documentation quality and completeness
2. Project structure and organization
3. Community guidelines and contribution processes
4. Code quality indicators
5. Maintenance and activity levels

Provide specific, actionable recommendations. Format as HTML with appropriate tags.`;
        
        return await this.makeRequest(prompt, 600);
    }
    
    /**
     * Analyzes contribution rules and guidelines
     * @param {Object} context - Repository context data
     * @returns {Promise<string>} - Analysis result
     */
    async analyzeContributionRules(context) {
        const { repo, contributing, codeOfConduct, readme } = context;
        
        let prompt = `You are summarizing the contribution guidelines for the GitHub repository "${repo.full_name}".

`;
        
        if (contributing) {
            prompt += `CONTRIBUTING.md content (first 1000 characters):
"${contributing.substring(0, 1000).replace(/\n/g, ' ')}..."

`;
        }
        
        if (codeOfConduct) {
            prompt += `CODE_OF_CONDUCT.md exists (length: ${codeOfConduct.length} characters)

`;
        }
        
        if (readme && !contributing) {
            prompt += `No CONTRIBUTING.md found. README.md content (first 800 characters):
"${readme.substring(0, 800).replace(/\n/g, ' ')}..."

`;
        }
        
        prompt += `Please provide a clear summary of:
1. How to contribute to this project (workflow, process)
2. Code style and standards requirements
3. Testing requirements
4. Communication guidelines and code of conduct
5. Any specific tools or setup needed

If information is missing, mention what contributors should look for or ask about. Format as HTML with appropriate tags.`;
        
        return await this.makeRequest(prompt, 600);
    }
    
    /**
     * Analyzes and provides project overview
     * @param {Object} context - Repository context data
     * @returns {Promise<string>} - Analysis result
     */
    async analyzeProjectOverview(context) {
        const { repo, readme } = context;
        
        let prompt = `You are providing an overview of the GitHub repository "${repo.full_name}" for potential contributors.

Repository Details:
- Name: ${repo.name}
- Description: ${repo.description || 'No description provided'}
- Language: ${repo.language || 'Not specified'}
- Created: ${repo.created_at}
- Last updated: ${repo.updated_at}
- Stars: ${repo.stargazers_count}
- Forks: ${repo.forks_count}
- Open issues: ${repo.open_issues_count}
- License: ${repo.license ? repo.license.name : 'Not specified'}

`;
        
        if (readme) {
            prompt += `README.md content (first 1500 characters):
"${readme.substring(0, 1500).replace(/\n/g, ' ')}..."

`;
        }
        
        prompt += `Please provide a comprehensive but concise overview including:
1. What this project does (purpose and main features)
2. Target audience and use cases
3. Technology stack and architecture
4. Project maturity and activity level
5. Why someone might want to contribute

Make it engaging and informative for potential contributors. Format as HTML with appropriate tags.`;
        
        return await this.makeRequest(prompt, 700);
    }
}

const groqService = new GroqService();
export default groqService;