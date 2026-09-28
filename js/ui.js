// ============================================
// UI RENDERING FUNCTIONS
// ============================================

/**
 * Render dashboard
 */
function renderDashboard(transactions) {
    const summary = getInventorySummary();
    const aging = getAgingReport();
    
    // Calculate actual sales profit from transactions
    const sales = transactions.filter(t => t.type === 'out');
    const totalRevenue = sales.reduce((sum, t) => sum + t.amount, 0);
    const totalCost = sales.reduce((sum, t) => sum + (t.cost || 0), 0);
    const actualProfit = totalRevenue - totalCost;
    
    document.getElementById('totalCards').textContent = summary.totalCards;
    document.getElementById('uniqueCards').textContent = summary.uniqueCards;
    document.getElementById('totalValue').textContent = `$${summary.totalValue.toFixed(2)}`;
    document.getElementById('totalSold').textContent = sales.length;
    document.getElementById('totalProfit').textContent = `$${actualProfit.toFixed(2)}`;
    document.getElementById('inventoryCount').textContent = `${summary.totalCards} cards`;
    document.getElementById('logCount').textContent = `${transactions.length} transactions`;
    
    // Aging report
    document.getElementById('agingNew').textContent = aging['New (0-7 days)'] || 0;
    document.getElementById('agingRecent').textContent = aging['Recent (8-30 days)'] || 0;
    document.getElementById('agingMedium').textContent = aging['Medium (31-90 days)'] || 0;
    document.getElementById('agingOld').textContent = aging['Old (91-180 days)'] || 0;
    document.getElementById('agingVeryOld').textContent = aging['Very Old (180+ days)'] || 0;
}

/**
 * Render inventory table
 */
function renderInventoryTable(filters = {}) {
    const cards = getInventory(filters);
    const tbody = document.getElementById('inventoryTableBody');
    
    if (cards.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 30px; color: #6b7a8f;">No cards found</td></tr>';
        return;
    }
    
    tbody.innerHTML = cards.map(c => {
        const qtyClass = c.quantity === 0 ? 'zero' : c.quantity < 3 ? 'low' : c.quantity < 10 ? 'medium' : 'high';
        const age = c.dateAdded ? getCardAge(c.dateAdded) : '';
        const ageDisplay = age !== null ? `${age}d` : 'N/A';
        
        return `
            <tr>
                <td><strong>${c.cardName}</strong></td>
                <td style="color: #4a5a6e;">${c.setName}</td>
                <td>${c.condition}</td>
                <td><span class="qty-badge ${qtyClass}">${c.quantity}</span></td>
                <td>${c.cost > 0 ? `$${c.cost.toFixed(2)}` : '-'}</td>
                <td>${c.sellPrice > 0 ? `$${c.sellPrice.toFixed(2)}` : '-'}</td>
                <td style="font-size: 0.85em; color: #6b7a8f;">${ageDisplay}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="editCard(${c.id})">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteCard(${c.id})">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Render transactions
 */
function renderTransactions(transactions) {
    const log = document.getElementById('transactionLog');
    
    if (transactions.length === 0) {
        log.innerHTML = '<div style="color: #6b7a8f; text-align: center; padding: 20px;">No transactions yet</div>';
        return;
    }
    
    log.innerHTML = transactions.slice(0, 100).map(t => {
        const typeClass = t.type === 'in' ? 'type-in' : t.type === 'out' ? 'type-out' : 'type-adjust';
        const typeIcon = t.type === 'in' ? '📥' : t.type === 'out' ? '💳' : '🔄';
        const time = new Date(t.timestamp).toLocaleString();
        const amount = t.amount > 0 ? ` $${t.amount.toFixed(2)}` : '';
        
        return `
            <div class="transaction-item">
                <span>
                    <span class="${typeClass}">${typeIcon} ${t.description}</span>
                </span>
                <span>
                    ${amount}
                    <span class="time">${time}</span>
                </span>
            </div>
        `;
    }).join('');
}

/**
 * Render quick stats
 */
function renderQuickStats(transactions) {
    // Top 5 most valuable cards
    const topCards = [...inventory]
        .sort((a, b) => (b.sellPrice * b.quantity) - (a.sellPrice * a.quantity))
        .slice(0, 5)
        .filter(c => c.sellPrice > 0 && c.quantity > 0);
    
    const topCardsDiv = document.getElementById('topCards');
    if (topCards.length === 0) {
        topCardsDiv.innerHTML = '<div style="color: #6b7a8f; text-align: center; padding: 10px;">Add cards to see stats</div>';
    } else {
        topCardsDiv.innerHTML = topCards.map(c => `
            <div class="stat-row">
                <span>${c.cardName}</span>
                <span class="value">$${(c.sellPrice * c.quantity).toFixed(2)}</span>
            </div>
        `).join('');
    }
    
    // Recent sales
    const recentSales = transactions.filter(t => t.type === 'out').slice(0, 5);
    const recentSalesDiv = document.getElementById('recentSales');
    if (recentSales.length === 0) {
        recentSalesDiv.innerHTML = '<div style="color: #6b7a8f; text-align: center; padding: 10px;">No sales yet</div>';
    } else {
        recentSalesDiv.innerHTML = recentSales.map(t => `
            <div class="stat-row">
                <span>${t.description}</span>
                <span class="value green">${t.amount > 0 ? `$${t.amount.toFixed(2)}` : ''}</span>
            </div>
        `).join('');
    }
}

/**
 * Update sell list
 */
function renderSellList(search = '') {
    const list = document.getElementById('sellList');
    const filtered = inventory.filter(c => 
        c.quantity > 0 && c.cardName.toLowerCase().includes(search.toLowerCase())
    );
    
    if (filtered.length === 0) {
        list.innerHTML = '<div style="color: #6b7a8f; text-align: center; padding: 20px;">No cards found</div>';
        return;
    }
    
    list.innerHTML = filtered.map(c => `
        <div class="sell-list-item" onclick="selectSellCard('${c.cardName}')">
            <span>${c.cardName}</span>
            <span class="qty-available">${c.quantity} available</span>
        </div>
    `).join('');
}

// ============================================
// BULK REVIEW FUNCTIONS
// ============================================

/**
 * Render bulk review panel - PER CARD PRICE
 */
function renderBulkReview(transactions, threshold = null) {
    const container = document.getElementById('bulkReviewContainer');
    if (!container) return;
    
    // Get threshold from slider if not provided
    if (threshold === null) {
        const slider = document.getElementById('bulkThreshold');
        threshold = slider ? parseFloat(slider.value) : 5;
    }
    
    // Update the display in real-time
    const display = document.getElementById('bulkThresholdDisplay');
    if (display) display.textContent = `$${threshold.toFixed(2)}`;
    
    // DEBUG: Log what we're looking for
    console.log('=== BULK REVIEW DEBUG ===');
    console.log('Per-card threshold: $', threshold);
    console.log('Total transactions:', transactions.length);
    
    // Get bulk sales and calculate per-card price
    const bulkSales = transactions.filter(t => {
        if (t.type !== 'out') return false;
        
        // Check if it's a bulk sale
        const desc = t.description.toLowerCase();
        const isBulk = 
            desc.includes('bulk') ||
            desc.includes('magic tcg singles') ||
            desc.includes('ccg singles') ||
            (desc.includes('singles') && !desc.includes('['));
        
        if (!isBulk) return false;
        
        // Extract quantity from description
        const qtyMatch = t.description.match(/(\d+)x?/);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        
        // Calculate per-card price
        const perCardPrice = qty > 0 ? t.amount / qty : 0;
        
        // Debug first few
        if (perCardPrice >= threshold) {
            console.log(`✅ Bulk found: "${t.description}" - $${t.amount.toFixed(2)} / ${qty} cards = $${perCardPrice.toFixed(2)} per card`);
        }
        
        return perCardPrice >= threshold;
    });
    
    console.log('Bulk sales found:', bulkSales.length);
    
    // Update the count badge
    const countBadge = document.getElementById('bulkCount');
    if (countBadge) countBadge.textContent = bulkSales.length;
    
    if (bulkSales.length === 0) {
        container.innerHTML = `
            <div style="color: #6b7a8f; text-align: center; padding: 20px;">
                ✅ No bulk sales with per-card price over $${threshold.toFixed(2)} found
                <div style="font-size: 0.8em; margin-top: 8px; color: #94a3b8;">
                    Threshold: $${threshold.toFixed(2)} per card
                </div>
            </div>
        `;
        return;
    }
    
    // Sort by per-card price (highest first)
    bulkSales.sort((a, b) => {
        const qtyA = parseInt(a.description.match(/(\d+)x?/)?.[1] || 1);
        const qtyB = parseInt(b.description.match(/(\d+)x?/)?.[1] || 1);
        const priceA = qtyA > 0 ? a.amount / qtyA : 0;
        const priceB = qtyB > 0 ? b.amount / qtyB : 0;
        return priceB - priceA;
    });
    
    const totalAmount = bulkSales.reduce((sum, t) => sum + t.amount, 0);
    const totalCards = bulkSales.reduce((sum, t) => {
        const qtyMatch = t.description.match(/(\d+)x?/);
        return sum + (qtyMatch ? parseInt(qtyMatch[1]) : 1);
    }, 0);
    
    container.innerHTML = `
        <div style="margin-bottom: 10px; color: #4a5a6e; font-size: 0.9em; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 5px;">
            <span>Found ${bulkSales.length} bulk sales with per-card price over $${threshold.toFixed(2)}</span>
            <span style="font-weight: 600; color: #059669;">Total: $${totalAmount.toFixed(2)} (${totalCards} cards)</span>
        </div>
        <div style="max-height: 400px; overflow-y: auto;">
            ${bulkSales.map((t, index) => {
                // Extract quantity from description
                const qtyMatch = t.description.match(/(\d+)x?/);
                const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
                const perCardPrice = qty > 0 ? t.amount / qty : 0;
                
                // Determine urgency based on per-card price
                let urgency = '';
                let urgencyColor = '';
                if (perCardPrice >= 20) {
                    urgency = '🔴 HIGH';
                    urgencyColor = '#dc2626';
                } else if (perCardPrice >= 10) {
                    urgency = '🟡 MEDIUM';
                    urgencyColor = '#d97706';
                } else {
                    urgency = '🟢 LOW';
                    urgencyColor = '#059669';
                }
                
                return `
                    <div class="bulk-item" style="
                        background: ${index % 2 === 0 ? '#f8fafc' : 'white'};
                        padding: 10px;
                        border-bottom: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-wrap: wrap;
                        gap: 10px;
                    ">
                        <div style="flex: 1; min-width: 150px;">
                            <div style="font-weight: 600;">${t.description}</div>
                            <div style="font-size: 0.85em; color: #6b7a8f;">
                                ${new Date(t.timestamp).toLocaleDateString()} • 
                                ${qty} cards • 
                                <span style="color: #059669; font-weight: 600;">$${t.amount.toFixed(2)} total</span>
                                <span style="color: ${urgencyColor}; font-weight: 600; margin-left: 8px;">
                                    $${perCardPrice.toFixed(2)}/card ${urgency}
                                </span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <select class="bulk-match-select" data-transaction-id="${t.id}" style="
                                padding: 6px 10px;
                                border: 1px solid #e2e8f0;
                                border-radius: 6px;
                                background: white;
                                min-width: 150px;
                                font-size: 0.9em;
                            ">
                                <option value="">Select matching card...</option>
                                ${inventory
                                    .filter(c => c.quantity > 0)
                                    .sort((a, b) => a.cardName.localeCompare(b.cardName))
                                    .map(c => `
                                        <option value="${c.id}">${c.cardName} (${c.setName}, ${c.quantity} left)</option>
                                    `).join('')}
                            </select>
                            <button class="btn btn-primary btn-sm" onclick="matchBulkCard(${t.id})">
                                ✓ Match
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Update bulk review threshold - with real-time display
 */
function updateBulkThreshold() {
    const slider = document.getElementById('bulkThreshold');
    if (!slider) return;
    
    const threshold = parseFloat(slider.value);
    // Update display immediately
    const display = document.getElementById('bulkThresholdDisplay');
    if (display) display.textContent = `$${threshold.toFixed(2)}`;
    
    renderBulkReview(transactions, threshold);
}

/**
 * Real-time slider update - shows value as you slide
 */
function updateBulkThresholdDisplay() {
    const slider = document.getElementById('bulkThreshold');
    if (!slider) return;
    
    const threshold = parseFloat(slider.value);
    const display = document.getElementById('bulkThresholdDisplay');
    if (display) display.textContent = `$${threshold.toFixed(2)}`;
}

/**
 * Refresh bulk review
 */
function refreshBulkReview() {
    const slider = document.getElementById('bulkThreshold');
    const threshold = slider ? parseFloat(slider.value) : 5;
    renderBulkReview(transactions, threshold);
    showImportStatus('info', '🔄 Bulk review refreshed');
}

/**
 * Match a bulk sale to a specific card
 */
function matchBulkCard(transactionId) {
    // Find the select element
    const select = document.querySelector(`.bulk-match-select[data-transaction-id="${transactionId}"]`);
    if (!select) {
        alert('Could not find the card selection dropdown');
        return;
    }
    
    const cardId = parseInt(select.value);
    if (!cardId) {
        alert('Please select a card to match');
        return;
    }
    
    // Get the selected option text
    const selectedOption = select.options[select.selectedIndex];
    const cardDisplayText = selectedOption ? selectedOption.text : '';
    
    // Find the transaction
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) {
        alert('Transaction not found');
        return;
    }
    
    // Find the card
    const card = findCardById(cardId);
    if (!card) {
        alert('Card not found in inventory');
        return;
    }
    
    // Extract quantity from description
    const qtyMatch = transaction.description.match(/(\d+)x?/);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
    
    // Confirm the match
    if (!confirm(`Match "${transaction.description}" to ${qty}x ${card.cardName} (${card.setName})?`)) {
        return;
    }
    
    // Update the transaction
    transaction.description = `${qty}x ${card.cardName} sold (bulk match)`;
    
    // Update the card's cost if available
    if (card.cost > 0) {
        transaction.cost = card.cost * qty;
    }
    
    // Save transactions
    saveTransactions();
    
    // Remove the card from inventory (if not already removed)
    if (card.quantity > 0) {
        const existingCard = inventory.find(c => c.id === cardId);
        if (existingCard && existingCard.quantity >= qty) {
            existingCard.quantity -= qty;
            if (existingCard.quantity === 0) {
                const index = inventory.indexOf(existingCard);
                if (index > -1) inventory.splice(index, 1);
            }
            saveInventory();
        }
    }
    
    // UPDATE THE DROPDOWN - Show the matched card
    if (select) {
        // Replace the dropdown with a visual indicator that it's been matched
        const parentDiv = select.parentNode;
        const matchButton = parentDiv.querySelector('.btn-primary');
        
        // Create a span to show the matched card
        const matchedSpan = document.createElement('span');
        matchedSpan.style.cssText = `
            padding: 6px 12px;
            background: #d1fae5;
            color: #065f46;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.9em;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        `;
        matchedSpan.innerHTML = `✅ ${cardDisplayText}`;
        
        // Replace the select with the matched indicator
        parentDiv.replaceChild(matchedSpan, select);
        
        // Also disable or remove the match button
        if (matchButton) {
            matchButton.disabled = true;
            matchButton.style.opacity = '0.5';
            matchButton.style.cursor = 'not-allowed';
            matchButton.textContent = '✓ Matched';
        }
    }
    
    // Re-render everything
    renderAll();
    renderBulkReview(transactions);
    
    // Show success message
    showImportStatus('success', `✅ Matched bulk sale to ${qty}x ${card.cardName}`);
}