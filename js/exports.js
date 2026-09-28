// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export current inventory as CSV
 */
function exportInventoryCSV() {
    if (inventory.length === 0) {
        alert('No inventory to export');
        return;
    }
    
    const today = getToday();
    let csv = 'Set Name,Number,Foil,Rarity,Condition,Quantity,Location,Card Name,Cost,Sell Price,Date Added,Age (days)\n';
    
    inventory.forEach(c => {
        const age = c.dateAdded ? getCardAge(c.dateAdded) : '';
        csv += `"${c.setName}","${c.number || ''}","${c.foil || ''}","${c.rarity || ''}","${c.condition}",${c.quantity},"${c.location || 'Store'}","${c.cardName}",${c.cost || 0},${c.sellPrice || 0},"${c.dateAdded || ''}",${age !== null ? age : ''}\n`;
    });
    
    downloadFile(csv, `inventory_export_${today}.csv`);
}

/**
 * Export TCGplayer format CSV
 */
function exportTCGplayerCSV() {
    if (inventory.length === 0) {
        alert('No inventory to export');
        return;
    }
    
    let csv = '"TCGplayer Id","Product Line","Set Name","Product Name","Title","Number","Rarity","Condition","TCG Market Price","TCG Direct Low","TCG Low Price With Shipping","TCG Low Price","Total Quantity","Add to Quantity","TCG Marketplace Price","My Store Reserve Quantity","My Store Price","Photo URL"\n';
    
    inventory.forEach(c => {
        const price = c.sellPrice || 0;
        csv += `"","Magic","${c.setName}","${c.cardName}","${c.cardName} (${c.setName})","${c.number || ''}","${c.rarity || ''}","${c.condition}",${price},${price},${price},${price},${c.quantity},0,${price},0,${price},""\n`;
    });
    
    downloadFile(csv, `tcgplayer_inventory_${getToday()}.csv`);
}

/**
 * Export sold cards (transactions)
 */
function exportSoldCardsCSV(transactions) {
    const sales = transactions.filter(t => t.type === 'out');
    if (sales.length === 0) {
        alert('No sold cards to export');
        return;
    }
    
    let csv = 'Date,Description,Quantity,Revenue,Cost,Profit\n';
    let totalRevenue = 0, totalCost = 0, totalCards = 0;
    
    sales.forEach(t => {
        const match = t.description.match(/(\d+)x?\s+([^(]+?)(?:\s+sold|$)/);
        let cardName = t.description;
        let qty = 1;
        
        if (match) {
            qty = parseInt(match[1]) || 1;
            cardName = match[2].trim();
        }
        
        cardName = cardName.replace(/\s+\([^)]*\)/g, '').trim();
        
        const date = new Date(t.timestamp).toLocaleString();
        const profit = t.amount - (t.cost || 0);
        
        csv += `"${date}","${cardName}",${qty},${t.amount.toFixed(2)},${(t.cost || 0).toFixed(2)},${profit.toFixed(2)}\n`;
        
        totalRevenue += t.amount;
        totalCost += (t.cost || 0);
        totalCards += qty;
    });
    
    const totalProfit = totalRevenue - totalCost;
    csv += `\n"SUMMARY","Total Sales",${totalCards},${totalRevenue.toFixed(2)},${totalCost.toFixed(2)},${totalProfit.toFixed(2)}\n`;
    
    downloadFile(csv, `sold_cards_export_${getToday()}.csv`);
}