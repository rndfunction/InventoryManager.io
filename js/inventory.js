// ============================================
// INVENTORY MANAGEMENT - FIXED
// ============================================

let inventory = [];
let nextId = 1;

/**
 * Load inventory from localStorage
 */
function loadInventory() {
    try {
        const saved = localStorage.getItem('mtgInventory');
        if (saved) {
            const data = JSON.parse(saved);
            inventory = data.inventory || [];
            nextId = data.nextId || 1;
            console.log('Loaded inventory:', inventory.length, 'cards');
            return true;
        }
    } catch (e) {
        console.error('Failed to load inventory:', e);
    }
    return false;
}

/**
 * Save inventory to localStorage
 */
function saveInventory() {
    try {
        localStorage.setItem('mtgInventory', JSON.stringify({
            inventory: inventory,
            nextId: nextId
        }));
        console.log('Saved inventory:', inventory.length, 'cards');
        return true;
    } catch (e) {
        console.error('Failed to save inventory:', e);
        return false;
    }
}

/**
 * Add a card to inventory - FIXED
 */
function addCard(cardData) {
    console.log('addCard called with:', cardData);
    
    // Extract values with defaults
    const cardName = cardData.cardName || cardData.name || '';
    const quantity = parseInt(cardData.quantity || cardData.qty || 0);
    const setName = cardData.setName || cardData.set || 'Unknown';
    const condition = cardData.condition || 'Near Mint';
    const foil = cardData.foil || '';
    const rarity = cardData.rarity || '';
    const number = cardData.number || '';
    const location = cardData.location || 'Store';
    const cost = parseFloat(cardData.cost || 0);
    const sellPrice = parseFloat(cardData.sellPrice || 0);
    
    console.log('Parsed values:', { cardName, quantity, setName, condition });
    
    // Validation
    if (!cardName) {
        console.error('Missing card name in:', cardData);
        throw new Error('Card name is required');
    }
    
    if (!quantity || quantity <= 0) {
        console.error('Invalid quantity in:', cardData);
        throw new Error('Valid quantity required');
    }
    
    // Check if card exists (by name, set, condition, foil)
    const existing = inventory.find(c => 
        c.cardName?.toLowerCase() === cardName.toLowerCase() && 
        c.setName === (setName || 'Unknown') &&
        c.condition === (condition || 'Near Mint') &&
        c.foil === (foil || '')
    );
    
    const dateAdded = getToday();
    let result;
    
    if (existing) {
        console.log('Card exists, adding to existing:', existing.cardName);
        existing.quantity += quantity;
        if (cost > 0) existing.cost = (existing.cost * (existing.quantity - quantity) + cost * quantity) / existing.quantity;
        if (sellPrice > 0) existing.sellPrice = sellPrice;
        result = { added: quantity, existed: true, card: existing };
    } else {
        console.log('Adding new card:', cardName);
        const card = {
            id: nextId++,
            cardName: cardName,
            setName: setName || 'Unknown',
            number: number || '',
            foil: foil || '',
            rarity: rarity || '',
            condition: condition || 'Near Mint',
            quantity: quantity,
            location: location || 'Store',
            cost: cost || 0,
            sellPrice: sellPrice || 0,
            dateAdded: dateAdded
        };
        inventory.push(card);
        result = { added: quantity, existed: false, card: card };
    }
    
    console.log('Card added successfully');
    return result;
}

/**
 * Sell cards from inventory
 */
function sellCards(cardName, quantity, price, condition, setName) {
    if (!cardName || !quantity || quantity <= 0) {
        throw new Error('Card name and valid quantity required');
    }
    
    // Find the card
    const card = inventory.find(c => 
        c.cardName?.toLowerCase() === cardName.toLowerCase() &&
        c.condition === (condition || c.condition) &&
        c.setName === (setName || c.setName)
    );
    
    if (!card) {
        throw new Error('Card not found in inventory');
    }
    
    if (card.quantity < quantity) {
        throw new Error(`Only ${card.quantity} available`);
    }
    
    card.quantity -= quantity;
    const revenue = (price || card.sellPrice || 0) * quantity;
    const cost = (card.cost || 0) * quantity;
    
    // Remove card if quantity is 0
    if (card.quantity === 0) {
        const index = inventory.indexOf(card);
        if (index > -1) inventory.splice(index, 1);
    }
    
    return { 
        revenue, 
        cost, 
        profit: revenue - cost,
        remaining: card.quantity
    };
}

/**
 * Get inventory summary
 */
function getInventorySummary() {
    const totalCards = inventory.reduce((sum, c) => sum + c.quantity, 0);
    const totalValue = inventory.reduce((sum, c) => sum + (c.sellPrice * c.quantity), 0);
    const totalCost = inventory.reduce((sum, c) => sum + (c.cost * c.quantity), 0);
    
    return {
        totalCards,
        uniqueCards: inventory.length,
        totalValue,
        totalCost,
        potentialProfit: totalValue - totalCost
    };
}

/**
 * Get aging report
 */
function getAgingReport() {
    const aging = {
        'New (0-7 days)': 0,
        'Recent (8-30 days)': 0,
        'Medium (31-90 days)': 0,
        'Old (91-180 days)': 0,
        'Very Old (180+ days)': 0,
        'Unknown': 0
    };
    
    inventory.forEach(card => {
        const category = getAgingCategory(card.dateAdded);
        aging[category] = (aging[category] || 0) + card.quantity;
    });
    
    return aging;
}

/**
 * Get cards by age filter
 */
function getCardsByAge(filter) {
    if (!filter) return inventory;
    
    const now = new Date();
    return inventory.filter(card => {
        if (!card.dateAdded) return false;
        const days = getCardAge(card.dateAdded);
        if (days === null) return false;
        
        switch(filter) {
            case '7': return days <= 7;
            case '30': return days <= 30;
            case '90': return days <= 90;
            case 'old': return days > 90;
            case 'veryold': return days > 180;
            default: return true;
        }
    });
}

/**
 * Find card by ID
 */
function findCardById(id) {
    return inventory.find(c => c.id === id);
}

/**
 * Delete card by ID
 */
function deleteCard(id) {
    const index = inventory.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Card not found');
    const card = inventory[index];
    inventory.splice(index, 1);
    return card;
}

/**
 * Update card
 */
function updateCard(id, updates) {
    const card = findCardById(id);
    if (!card) throw new Error('Card not found');
    Object.assign(card, updates);
    return card;
}

/**
 * Get all cards (with optional filters)
 */
function getInventory(filters = {}) {
    let result = [...inventory];
    
    if (filters.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(c => c.cardName.toLowerCase().includes(search));
    }
    
    if (filters.condition) {
        result = result.filter(c => c.condition === filters.condition);
    }
    
    if (filters.stock) {
        if (filters.stock === 'in') result = result.filter(c => c.quantity > 0);
        else if (filters.stock === 'low') result = result.filter(c => c.quantity > 0 && c.quantity < 3);
        else if (filters.stock === 'out') result = result.filter(c => c.quantity === 0);
    }
    
    if (filters.age) {
        result = getCardsByAge(filters.age);
    }
    
    return result.sort((a, b) => a.cardName.localeCompare(b.cardName));
}