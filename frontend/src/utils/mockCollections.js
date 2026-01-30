/**
 * Mock Collections Utility
 * 
 * Groups endpoints into collections based on URL paths
 * This is a temporary solution until backend implements Collections model
 */

/**
 * Extract collection name from endpoint URL
 * @param {string} url - Endpoint URL (e.g., "/api/users/123")
 * @returns {string} Collection name (e.g., "Users")
 */
function extractCollectionName(url) {
    const pathParts = url.split('/').filter(Boolean);

    // Skip 'api' prefix if present
    const startIndex = pathParts[0] === 'api' ? 1 : 0;

    if (pathParts.length > startIndex) {
        const collectionPart = pathParts[startIndex];
        // Convert to title case: "users" -> "Users", "user-profiles" -> "User Profiles"
        return collectionPart
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    return 'Uncategorized';
}

/**
 * Group endpoints into mock collections
 * @param {Array} endpoints - Array of endpoint objects
 * @returns {Array} Array of collection objects with nested endpoints
 */
export function createMockCollections(endpoints) {
    const collectionsMap = {};

    endpoints.forEach(endpoint => {
        const collectionName = extractCollectionName(endpoint.url);

        if (!collectionsMap[collectionName]) {
            collectionsMap[collectionName] = {
                id: collectionName.toLowerCase().replace(/\s+/g, '-'),
                name: collectionName,
                endpoints: [],
            };
        }

        collectionsMap[collectionName].endpoints.push(endpoint);
    });

    return Object.values(collectionsMap);
}

/**
 * Infer test case category from test case data
 * @param {Object} testCase - Test case object
 * @returns {string} Category: 'FUNCTIONAL', 'VALIDATION', 'SECURITY', or 'UX_ERROR'
 */
export function inferTestCategory(testCase) {
    const title = (testCase.title || '').toLowerCase();
    const description = (testCase.description || '').toLowerCase();
    const combined = `${title} ${description}`;

    // Validation keywords
    if (
        combined.includes('valid') ||
        combined.includes('required') ||
        combined.includes('missing') ||
        combined.includes('empty') ||
        combined.includes('null')
    ) {
        return 'VALIDATION';
    }

    // Security keywords
    if (
        combined.includes('security') ||
        combined.includes('auth') ||
        combined.includes('unauthorized') ||
        combined.includes('forbidden') ||
        combined.includes('permission') ||
        combined.includes('injection')
    ) {
        return 'SECURITY';
    }

    // UX/Error keywords
    if (
        combined.includes('error') ||
        combined.includes('message') ||
        combined.includes('user-friendly') ||
        combined.includes('helpful')
    ) {
        return 'UX_ERROR';
    }

    // Default to functional
    return 'FUNCTIONAL';
}

/**
 * Add category to test cases that don't have one
 * @param {Array} testCases - Array of test case objects
 * @returns {Array} Test cases with inferred categories
 */
export function enrichTestCasesWithCategories(testCases) {
    return testCases.map(testCase => ({
        ...testCase,
        category: testCase.category || inferTestCategory(testCase),
    }));
}
