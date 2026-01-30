/**
 * Variable Substitution Utility
 * 
 * Replaces {{variable_name}} placeholders with values from the environment configuration.
 * 
 * @param {string|object} content - The content to substitute (string or JSON object)
 * @param {object} variables - Key-value pairs of variables (e.g. { base_url: 'http://localhost' })
 * @returns {string|object} - Content with substituted variables
 */
export const substituteVariables = (content, variables) => {
    if (!content || !variables) return content;

    const substituteString = (str) => {
        if (typeof str !== 'string') return str;
        return str.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
            const variable = variables.find(v => v.key === key.trim() && v.enabled !== false);
            // If variable found, return value. If not found, return original match (or empty?)
            // Postman keeps original if not found. We'll do same.
            if (variable) return variable.value;

            // Check if variables is a simple object (legacy/simple support)
            if (!Array.isArray(variables)) {
                return variables[key.trim()] !== undefined ? variables[key.trim()] : match;
            }

            return match;
        });
    };

    if (typeof content === 'string') {
        return substituteString(content);
    }

    if (Array.isArray(content)) {
        return content.map(item => substituteVariables(item, variables));
    }

    if (typeof content === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(content)) {
            result[key] = substituteVariables(value, variables);
        }
        return result;
    }

    return content;
};
