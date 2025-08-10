import fetch from 'node-fetch';

class GitHubService {
    constructor() {
        this.baseURL = 'https://api.github.com';
        this.headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'OpenSourceGuide-AI/1.0'
        };
        
        // Add authentication if GitHub token is provided
        if (process.env.GITHUB_TOKEN) {
            this.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }
    }
    
    /**
     * Makes a request to GitHub API with error handling
     */
    async makeRequest(endpoint) {
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            const response = await fetch(url, { headers: this.headers });
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Resource not found: ${endpoint}`);
                } else if (response.status === 403) {
                    throw new Error('GitHub API rate limit exceeded or forbidden');
                } else if (response.status === 401) {
                    throw new Error('GitHub API authentication failed');
                } else {
                    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
                }
            }
            
            return await response.json();
        } catch (error) {
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                throw new Error('Unable to connect to GitHub API');
            }
            throw error;
        }
    }
    
    /**
     * Gets GitHub API rate limit status
     */
    getRateLimitStatus() {
        return {
            authenticated: !!this.headers.Authorization,
            limits: this.headers.Authorization 
                ? '5000 requests/hour (authenticated)'
                : '60 requests/hour (unauthenticated)'
        };
    }
    
    /**
     * Fetches repository metadata
     */
    async getRepositoryMetadata(owner, repo) {
        return await this.makeRequest(`/repos/${owner}/${repo}`);
    }
    
    /**
     * Fetches beginner-friendly issues
     */
    async getBeginnerFriendlyIssues(owner, repo) {
        try {
            const labels = ['good first issue', 'help wanted', 'beginner', 'easy', 'starter'];
            const labelQuery = labels.map(label => `label:"${label}"`).join(' OR ');
            const query = `repo:${owner}/${repo} is:open is:issue (${labelQuery})`;
            
            const searchUrl = `/search/issues?q=${encodeURIComponent(query)}&sort=created&order=desc&per_page=20`;
            const searchResult = await this.makeRequest(searchUrl);
            
            return searchResult.items || [];
        } catch (error) {
            console.warn(`Could not fetch beginner-friendly issues for ${owner}/${repo}:`, error.message);
            return [];
        }
    }
    
    /**
     * Fetches file content from repository
     */
    async getFileContent(owner, repo, path) {
        try {
            const response = await this.makeRequest(`/repos/${owner}/${repo}/contents/${path}`);
            
            if (response.content && response.encoding === 'base64') {
                return Buffer.from(response.content, 'base64').toString('utf-8');
            }
            
            return null;
        } catch (error) {
            console.warn(`Could not fetch ${path} for ${owner}/${repo}:`, error.message);
            return null;
        }
    }
    
    /**
     * Gets repository statistics
     */
    async getRepositoryStats(owner, repo) {
        try {
            const [contributors, branches, releases] = await Promise.allSettled([
                this.makeRequest(`/repos/${owner}/${repo}/contributors?per_page=100`),
                this.makeRequest(`/repos/${owner}/${repo}/branches?per_page=100`),
                this.makeRequest(`/repos/${owner}/${repo}/releases?per_page=10`)
            ]);
            
            return {
                contributorCount: contributors.status === 'fulfilled' ? contributors.value.length : 0,
                branchCount: branches.status === 'fulfilled' ? branches.value.length : 0,
                releaseCount: releases.status === 'fulfilled' ? releases.value.length : 0
            };
        } catch (error) {
            console.warn(`Could not fetch repository stats for ${owner}/${repo}:`, error.message);
            return {
                contributorCount: 0,
                branchCount: 0,
                releaseCount: 0
            };
        }
    }
}

// Create and export service instance
const githubService = new GitHubService();
export default githubService;