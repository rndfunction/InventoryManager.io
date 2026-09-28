// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Parse CSV line with proper quote handling
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

/**
 * Clean card name (remove extra info)
 */
function cleanCardName(name) {
    return name
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s+\[[^\]]+\]$/, '')
        .replace(/\s+FOIL$/i, '')
        .trim();
}

/**
 * Get age of card in days
 */
function getCardAge(dateAdded) {
    if (!dateAdded) return null;
    const added = new Date(dateAdded);
    const now = new Date();
    return Math.floor((now - added) / (1000 * 60 * 60 * 24));
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

/**
 * Get today's date as YYYY-MM-DD
 */
function getToday() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Download file
 */
function downloadFile(content, filename, type = 'text/csv') {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Parse decklist text
 */
function parseDecklist(text) {
    const cards = {};
    const lines = text.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
        
        const match = trimmed.match(/^(\d+)(?:x?)\s+(.+)$/);
        if (match) {
            const qty = parseInt(match[1]);
            const name = cleanCardName(match[2]);
            if (name) cards[name] = (cards[name] || 0) + qty;
        }
    }
    return cards;
}

/**
 * Get aging category for a card
 */
function getAgingCategory(dateAdded) {
    if (!dateAdded) return 'Unknown';
    
    const days = getCardAge(dateAdded);
    if (days === null) return 'Unknown';
    
    if (days <= 7) return 'New (0-7 days)';
    if (days <= 30) return 'Recent (8-30 days)';
    if (days <= 90) return 'Medium (31-90 days)';
    if (days <= 180) return 'Old (91-180 days)';
    return 'Very Old (180+ days)';
}

/**
 * Get aging color class
 */
function getAgingColor(dateAdded) {
    if (!dateAdded) return '';
    
    const days = getCardAge(dateAdded);
    if (days === null) return '';
    
    if (days <= 7) return 'aging-new';
    if (days <= 30) return 'aging-recent';
    if (days <= 90) return 'aging-medium';
    if (days <= 180) return 'aging-old';
    return 'aging-veryold';
}