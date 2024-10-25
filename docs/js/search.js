// Create this file at static/js/search.js
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

let jsonData;
let fuse;

// Fetch the search index
const fetchJsonData = async () => {
    try {
        const response = await fetch('/index.json');
        jsonData = await response.json();
        initFuse(jsonData);
    } catch (error) {
        console.error('Error fetching JSON:', error);
    }
};

// Initialize Fuse.js
const initFuse = (data) => {
    const options = {
        keys: ['title', 'content', 'tags'],
        includeScore: true,
        threshold: 0.4,
    };
    fuse = new Fuse(data, options);
};

// Perform search
const performSearch = (searchQuery) => {
    if (!fuse) return;

    const results = fuse.search(searchQuery);
    displayResults(results);
};

// Display results
const displayResults = (results) => {
    searchResults.innerHTML = '';

    if (results.length === 0) {
        searchResults.innerHTML = '<li class="no-results">No results found</li>';
        return;
    }

    results.forEach((result) => {
        const item = result.item;
        const li = document.createElement('li');
        li.className = 'search-result-item';

        const a = document.createElement('a');
        a.href = item.permalink;
        a.textContent = item.title;

        li.appendChild(a);
        searchResults.appendChild(li);
    });
};

// Event listener for search input
searchInput.addEventListener('input', (e) => {
    const searchQuery = e.target.value;
    if (searchQuery.length > 2) {
        performSearch(searchQuery);
    } else {
        searchResults.innerHTML = '';
    }
});

// Initialize search on page load
fetchJsonData();