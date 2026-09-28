// ============================================
// MAIN APPLICATION
// ============================================

console.log('=== Checking loaded functions ===');
console.log('typeof renderDashboard:', typeof renderDashboard);
console.log('typeof renderInventoryTable:', typeof renderInventoryTable);
console.log('typeof renderTransactions:', typeof renderTransactions);
console.log('typeof renderQuickStats:', typeof renderQuickStats);
console.log('typeof getInventory:', typeof getInventory);
console.log('typeof addCard:', typeof addCard);

// Global state
let transactions = [];

/**
 * Initialize the application
 */
function initApp() {
    // Load data
    loadInventory();
    loadTransactions();
    
    // Render everything
    renderAll();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('🚀 MTG Inventory Manager ready');
    console.log(`📊 Loaded ${inventory.length} cards from storage`);
    console.log(`📋 Loaded ${transactions.length} transactions`);
}

/**
 * Load transactions from localStorage
 */
function loadTransactions() {
    try {
        const saved = localStorage.getItem('mtgTransactions');
        if (saved) {
            transactions = JSON.parse(saved);
            return true;
        }
    } catch (e) {
        console.error('Failed to load transactions:', e);
    }
    transactions = [];
    return false;
}

/**
 * Save transactions to localStorage
 */
function saveTransactions() {
    try {
        localStorage.setItem('mtgTransactions', JSON.stringify(transactions));
        return true;
    } catch (e) {
        console.error('Failed to save transactions:', e);
        return false;
    }
}

/**
 * Add a transaction
 */
function addTransaction(type, description, amount = 0, cost = 0) {
    transactions.unshift({
        id: transactions.length + 1,
        type: type,
        description: description,
        amount: amount,
        cost: cost,
        timestamp: new Date().toISOString()
    });
    
    if (transactions.length > 500) {
        transactions = transactions.slice(0, 500);
    }
    
    saveTransactions();
}

/**
 * Render everything
 */
function renderAll() {
    // Check if all required functions exist
    if (typeof renderDashboard !== 'function') {
        console.error('renderDashboard is not defined! Check that ui.js is loaded.');
        return;
    }
    if (typeof renderInventoryTable !== 'function') {
        console.error('renderInventoryTable is not defined! Check that ui.js is loaded.');
        return;
    }
    if (typeof renderTransactions !== 'function') {
        console.error('renderTransactions is not defined! Check that ui.js is loaded.');
        return;
    }
    if (typeof renderQuickStats !== 'function') {
        console.error('renderQuickStats is not defined! Check that ui.js is loaded.');
        return;
    }
    if (typeof renderBulkReview !== 'function') {
        console.error('renderBulkReview is not defined! Check that ui.js is loaded.');
        return;
    }
    
    renderDashboard(transactions);
    
    // Get filters
    const search = document.getElementById('tableSearch')?.value || '';
    const condition = document.getElementById('filterCondition')?.value || '';
    const stock = document.getElementById('filterStock')?.value || '';
    const age = document.getElementById('filterAge')?.value || '';
    
    renderInventoryTable({ search, condition, stock, age });
    renderTransactions(transactions);
    renderQuickStats(transactions);
    renderBulkReview(transactions);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Search on input
    document.getElementById('tableSearch')?.addEventListener('input', renderAll);
    document.getElementById('filterCondition')?.addEventListener('change', renderAll);
    document.getElementById('filterStock')?.addEventListener('change', renderAll);
    document.getElementById('filterAge')?.addEventListener('change', renderAll);
    
    // Sell search
    document.getElementById('sellSearch')?.addEventListener('input', function(e) {
        renderSellList(e.target.value);
    });
    
    // REAL-TIME BULK THRESHOLD - shows value as you slide
    document.getElementById('bulkThreshold')?.addEventListener('input', function(e) {
        const threshold = parseFloat(e.target.value);
        const display = document.getElementById('bulkThresholdDisplay');
        if (display) display.textContent = `$${threshold.toFixed(2)}`;
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });
}

// ============================================
// UI ACTION FUNCTIONS
// ============================================

/**
 * Add a card (from form)
 */
function addCardFromForm() {
    const cardData = {
        cardName: document.getElementById('cardName').value.trim(),
        quantity: parseInt(document.getElementById('cardQty').value) || 0,
        setName: document.getElementById('cardSet').value.trim(),
        condition: document.getElementById('cardCondition').value,
        cost: parseFloat(document.getElementById('cardCost').value) || 0,
        sellPrice: parseFloat(document.getElementById('cardSellPrice').value) || 0,
        foil: '',
        rarity: '',
        number: '',
        location: 'Store'
    };
    
    if (!cardData.cardName || cardData.quantity <= 0) {
        alert('Please enter a card name and quantity');
        return;
    }
    
    try {
        const result = addCard(cardData);
        saveInventory();
        addTransaction('in', `${cardData.quantity}x ${cardData.cardName}`, cardData.cost * cardData.quantity);
        renderAll();
        clearAddForm();
        showImportStatus('success', `✅ Added ${result.added}x ${cardData.cardName}`);
    } catch (e) {
        showImportStatus('error', `❌ ${e.message}`);
    }
}

/**
 * Sell card (from form)
 */
function sellCardFromForm() {
    const cardName = document.getElementById('selectedCard').value;
    const quantity = parseInt(document.getElementById('sellQty').value) || 0;
    const price = parseFloat(document.getElementById('sellPrice').value) || 0;
    
    if (!cardName || quantity <= 0) {
        alert('Please select a card and enter quantity');
        return;
    }
    
    try {
        const result = sellCards(cardName, quantity, price);
        saveInventory();
        addTransaction('out', `${quantity}x ${cardName} sold`, result.revenue, result.cost);
        renderAll();
        clearSellForm();
        showImportStatus('success', `✅ Sold ${quantity}x ${cardName} for $${result.revenue.toFixed(2)}`);
    } catch (e) {
        showImportStatus('error', `❌ ${e.message}`);
    }
}

/**
 * Adjust quantity (from form)
 */
function adjustQuantity() {
    const cardName = document.getElementById('selectedCard').value;
    const quantity = parseInt(document.getElementById('sellQty').value) || 0;
    
    if (!cardName) {
        alert('Please select a card');
        return;
    }
    
    const card = inventory.find(c => c.cardName === cardName);
    if (!card) {
        alert('Card not found in inventory');
        return;
    }
    
    const newQty = quantity;
    if (newQty < 0) {
        alert('Quantity cannot be negative');
        return;
    }
    
    const diff = newQty - card.quantity;
    card.quantity = newQty;
    
    if (diff > 0) {
        addTransaction('adjust', `Adjusted ${card.cardName} +${diff}`);
    } else if (diff < 0) {
        addTransaction('adjust', `Adjusted ${card.cardName} ${diff}`);
    }
    
    if (card.quantity === 0) {
        const index = inventory.indexOf(card);
        if (index > -1) inventory.splice(index, 1);
    }
    
    saveInventory();
    renderAll();
    clearSellForm();
}

/**
 * Import TCGplayer CSV file
 */
function importTCGplayerFile() {
    const fileInput = document.getElementById('bulkFile');
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select a CSV file first');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            console.log('Starting import...');
            // Make sure the function exists
            if (typeof importTCGplayerCSV !== 'function') {
                throw new Error('importTCGplayerCSV function not found. Check that imports.js is loaded.');
            }
            const result = importTCGplayerCSV(e.target.result);
            console.log('Import result:', result);
            
            // Save inventory after import
            saveInventory();
            
            // Add transaction
            addTransaction('in', `Imported ${result.added} cards from TCGplayer CSV`);
            
            // Render everything
            renderAll();
            
            // Show success message
            showImportStatus('success', `✅ Imported ${result.added} cards!\n📊 ${inventory.length} unique cards in inventory\n⚠️ ${result.skipped} rows skipped`);
            
            console.log('Final inventory count:', inventory.length);
        } catch (error) {
            console.error('Import error:', error);
            showImportStatus('error', `❌ ${error.message}`);
        }
    };
    reader.readAsText(fileInput.files[0]);
}

/**
 * Import sold cards CSV file
 */
function importSoldFile() {
    const fileInput = document.getElementById('soldFile');
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select a CSV file first');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            console.log('Starting sold import...');
            if (typeof importSoldCardsCSV !== 'function') {
                throw new Error('importSoldCardsCSV function not found. Check that imports.js is loaded.');
            }
            const result = importSoldCardsCSV(e.target.result);
            console.log('Sold import result:', result);
            saveInventory();
            renderAll();
            
            let message = `✅ Processed ${result.sold} sold cards!\n`;
            message += `💳 Revenue: $${result.totalRevenue.toFixed(2)}\n`;
            message += `✅ Matched: ${result.matched} cards\n`;
            if (result.fuzzyMatches > 0) message += `🔍 Fuzzy matches: ${result.fuzzyMatches}\n`;
            if (result.notFound > 0) message += `⚠️ ${result.notFound} cards not found\n`;
            if (result.insufficientStock > 0) message += `⚠️ ${result.insufficientStock} insufficient stock\n`;
            if (result.bulkSales > 0) message += `📦 ${result.bulkSales} bulk sales skipped`;
            
            showImportStatus('success', message);
        } catch (error) {
            console.error('Sold import error:', error);
            showImportStatus('error', `❌ ${error.message}`);
        }
    };
    reader.readAsText(fileInput.files[0]);
}

/**
 * Import decklist
 */
function importDecklist() {
    const text = document.getElementById('bulkDecklist').value;
    if (!text.trim()) {
        alert('Please paste a decklist');
        return;
    }
    
    const cards = parseDecklist(text);
    let added = 0;
    
    for (const [name, qty] of Object.entries(cards)) {
        try {
            addCard({
                cardName: name,
                quantity: qty,
                setName: 'Unknown',
                condition: 'Near Mint',
                cost: 0,
                sellPrice: 0
            });
            added += qty;
        } catch (e) {
            // Skip errors
        }
    }
    
    saveInventory();
    addTransaction('in', `Imported ${added} cards from decklist`);
    renderAll();
    document.getElementById('bulkDecklist').value = '';
    showImportStatus('success', `✅ Added ${added} cards to inventory!`);
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Show import status
 */
function showImportStatus(type, message) {
    const statusDiv = document.getElementById('importStatus');
    statusDiv.className = 'import-status ' + type;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    setTimeout(() => { statusDiv.style.display = 'none'; }, 15000);
}

/**
 * Clear add form
 */
function clearAddForm() {
    document.getElementById('cardName').value = '';
    document.getElementById('cardQty').value = '1';
    document.getElementById('cardSet').value = '';
    document.getElementById('cardCost').value = '';
    document.getElementById('cardSellPrice').value = '';
}

/**
 * Clear sell form
 */
function clearSellForm() {
    document.getElementById('selectedCard').value = '';
    document.getElementById('sellSearch').value = '';
    document.getElementById('sellQty').value = '1';
    document.getElementById('sellPrice').value = '';
    document.getElementById('sellList').innerHTML = '<div style="color: #6b7a8f; text-align: center; padding: 20px;">Search for a card to sell</div>';
}

/**
 * Select a card to sell
 */
function selectSellCard(name) {
    document.getElementById('selectedCard').value = name;
    document.getElementById('sellSearch').value = name;
    document.getElementById('sellQty').value = 1;
    document.getElementById('sellList').innerHTML = `<div style="color: #059669; text-align: center; padding: 10px; font-weight: 600;">✅ Selected: ${name}</div>`;
}

/**
 * Edit card (open modal)
 */
function editCard(id) {
    const card = findCardById(id);
    if (!card) return;
    
    document.getElementById('editName').value = card.cardName;
    document.getElementById('editQty').value = card.quantity;
    document.getElementById('editCondition').value = card.condition;
    document.getElementById('editCost').value = card.cost || '';
    document.getElementById('editSellPrice').value = card.sellPrice || '';
    
    document.getElementById('editModal').classList.add('active');
    document.getElementById('editModal').dataset.editId = id;
}

/**
 * Save edit
 */
function saveEdit() {
    const id = parseInt(document.getElementById('editModal').dataset.editId);
    const qty = parseInt(document.getElementById('editQty').value) || 0;
    const condition = document.getElementById('editCondition').value;
    const cost = parseFloat(document.getElementById('editCost').value) || 0;
    const sellPrice = parseFloat(document.getElementById('editSellPrice').value) || 0;
    
    if (qty < 0) {
        alert('Quantity cannot be negative');
        return;
    }
    
    try {
        const card = updateCard(id, { quantity: qty, condition, cost, sellPrice });
        saveInventory();
        addTransaction('adjust', `Updated ${card.cardName}: ${card.quantity} → ${qty}`);
        renderAll();
        closeModal();
        showImportStatus('success', `✅ Updated ${card.cardName}`);
    } catch (e) {
        showImportStatus('error', `❌ ${e.message}`);
    }
}

/**
 * Delete card
 */
function deleteCard(id) {
    if (!confirm('Delete this card from inventory?')) return;
    
    try {
        const card = deleteCard(id);
        saveInventory();
        addTransaction('adjust', `Removed ${card.cardName} from inventory`);
        renderAll();
        showImportStatus('success', `✅ Removed ${card.cardName}`);
    } catch (e) {
        showImportStatus('error', `❌ ${e.message}`);
    }
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('editModal').classList.remove('active');
}

/**
 * Confirm clear all data
 */
function confirmClearAll() {
    if (!confirm('⚠️ Delete ALL inventory and transaction data? This cannot be undone!')) return;
    if (!confirm('Really?')) return;
    
    inventory = [];
    transactions = [];
    nextId = 1;
    saveInventory();
    saveTransactions();
    renderAll();
    alert('All data cleared');
}

// ============================================
// EXPOSE TO GLOBAL SCOPE
// ============================================

// Core functions
window.addCardFromForm = addCardFromForm;
window.sellCardFromForm = sellCardFromForm;
window.adjustQuantity = adjustQuantity;

// Import functions
window.importTCGplayerFile = importTCGplayerFile;
window.importSoldFile = importSoldFile;
window.importDecklist = importDecklist;

// Export functions
window.exportInventory = exportInventoryCSV;
window.exportTCGplayer = exportTCGplayerCSV;
window.exportSoldCards = () => exportSoldCardsCSV(transactions);

// UI functions
window.editCard = editCard;
window.saveEdit = saveEdit;
window.deleteCard = deleteCard;
window.closeModal = closeModal;
window.selectSellCard = selectSellCard;
window.confirmClearAll = confirmClearAll;
window.toggleDebug = toggleDebug;
window.clearDebug = clearDebug;

// Bulk review functions
window.updateBulkThreshold = updateBulkThreshold;
window.updateBulkThresholdDisplay = updateBulkThresholdDisplay;
window.refreshBulkReview = refreshBulkReview;
window.matchBulkCard = matchBulkCard;

console.log('✅ All functions exposed to global scope');