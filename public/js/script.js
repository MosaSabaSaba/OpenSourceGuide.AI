const repoInput = document.getElementById('repoInput');
const searchBtn = document.getElementById('searchBtn');
const repoTitle = document.getElementById('repoTitle');
const btnText = searchBtn.querySelector('.btn-text');
const loading = searchBtn.querySelector('.loading');

const contentElements = {
    start: document.getElementById('startContent'),
    improving: document.getElementById('improvingContent'),
    rules: document.getElementById('rulesContent'),
    about: document.getElementById('aboutContent')
};

// Mock data for demonstration
const mockResponses = {
    start: `
        <h6 class="text-success mb-3">Good First Issues Found:</h6>
        <ul class="list-unstyled text-start">
            <li class="mb-2">• <strong>Add unit tests for utility functions</strong> - Perfect for learning the codebase</li>
            <li class="mb-2">• <strong>Update documentation examples</strong> - Help improve user experience</li>
            <li class="mb-2">• <strong>Fix typos in README</strong> - Simple but valuable contribution</li>
            <li class="mb-2">• <strong>Add error handling to API calls</strong> - Good for intermediate beginners</li>
        </ul>
        <div class="mt-3 text-muted small">💡 Start with documentation or testing contributions to familiarize yourself with the project</div>
    `,
    improving: `
        <h6 class="text-warning mb-3">Areas Needing Attention:</h6>
        <div class="text-start">
            <p><strong>📚 Documentation:</strong> API documentation is incomplete, missing examples for advanced usage</p>
            <p><strong>🔧 Code Quality:</strong> Several functions lack proper error handling and input validation</p>
            <p><strong>🧪 Testing:</strong> Test coverage is at 65% - missing tests for edge cases</p>
            <p><strong>📦 Dependencies:</strong> 3 outdated dependencies with known security vulnerabilities</p>
        </div>
        <div class="mt-3 text-muted small">🎯 Contributing to these areas would have high impact</div>
    `,
    rules: `
        <h6 class="text-info mb-3">Contribution Guidelines:</h6>
        <div class="text-start">
            <p><strong>🔀 Workflow:</strong> Fork → Feature branch → Pull request → Code review</p>
            <p><strong>💻 Code Style:</strong> ESLint + Prettier, 2-space indentation, descriptive variable names</p>
            <p><strong>✅ Requirements:</strong> All tests must pass, add tests for new features</p>
            <p><strong>📝 Commits:</strong> Use conventional commits (feat:, fix:, docs:, etc.)</p>
            <p><strong>🤝 Code of Conduct:</strong> Be respectful, inclusive, and constructive in all interactions</p>
        </div>
        <div class="mt-3 text-muted small">📖 Read CONTRIBUTING.md for complete details</div>
    `,
    about: `
        <h6 class="text-primary mb-3">Project Overview:</h6>
        <div class="text-start">
            <p><strong>🎯 Purpose:</strong> A modern web application for managing and visualizing data workflows</p>
            <p><strong>⚡ Tech Stack:</strong> React, Node.js, PostgreSQL, Docker</p>
            <p><strong>🌟 Key Features:</strong> Real-time data processing, interactive dashboards, API integrations</p>
            <p><strong>👥 Community:</strong> 150+ contributors, 2.3k stars, active development</p>
            <p><strong>🚀 Status:</strong> Production-ready, actively maintained, regular releases</p>
        </div>
        <div class="mt-3 text-muted small">🔍 Perfect for developers interested in data visualization and workflow automation</div>
    `
};

function showLoading() {
    btnText.style.display = 'none';
    loading.style.display = 'inline-block';
    searchBtn.disabled = true;
}

function hideLoading() {
    btnText.style.display = 'inline-block';
    loading.style.display = 'none';
    searchBtn.disabled = false;
}

function updateContent(type, content) {
    contentElements[type].innerHTML = content;
}

function extractRepoName(url) {
    const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    return match ? match[1] : 'Repository';
}

async function analyzeRepository(url) {
    showLoading();
    
    try {
        // Update repo title
        const repoName = extractRepoName(url);
        repoTitle.textContent = `Analysis for ${repoName}`;
        
        // Simulate API calls with delays
        const delays = [1000, 1500, 2000, 2500];
        const types = ['start', 'improving', 'rules', 'about'];
        
        types.forEach((type, index) => {
            setTimeout(() => {
                updateContent(type, mockResponses[type]);
            }, delays[index]);
        });
        
    } catch (error) {
        console.error('Error analyzing repository:', error);
        Object.keys(contentElements).forEach(type => {
            updateContent(type, '<p class="text-danger">Error analyzing repository. Please try again.</p>');
        });
    } finally {
        setTimeout(hideLoading, 3000);
    }
}

function handleSearch() {
    const url = repoInput.value.trim();
    
    if (!url) {
        alert('Please enter a GitHub repository URL');
        return;
    }
    
    if (!url.includes('github.com')) {
        alert('Please enter a valid GitHub repository URL');
        return;
    }
    
    analyzeRepository(url);
}

searchBtn.addEventListener('click', handleSearch);

repoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

// Add some subtle animations on page load
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.info-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 150);
    });
});