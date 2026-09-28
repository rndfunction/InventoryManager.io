// ============================================
// IMPORT FUNCTIONS
// ============================================

/**
 * Parse sold card name (smart parser)
 */
function parseSoldCardName(name, qty, price) {
    // Handle bulk Magic TCG Singles
    if (name === 'Magic TCG Singles' || name === 'CCG Singles' || name === 'CCG Singles: Magic') {
        return { name: 'Bulk Magic Singles', set: 'Bulk', condition: 'Mixed', isBulk: true, quantity: qty, price: price / qty, totalPrice: price };
    }
    
    // Handle dice/accessories
    if (name.includes('Dice Loose Singles')) {
        return { name: name, set: 'Accessories', condition: 'N/A', isBulk: false, quantity: qty, price: price / qty, totalPrice: price };
    }
    
    // Handle "CCG Singles: Magic [SET] Card Name (Extra Info)"
    if (name.startsWith('CCG Singles: Magic')) {
        const setMatch = name.match(/\[([^\]]+)\]/);
        const set = setMatch ? setMatch[1] : 'Unknown';
        let cleanName = name.replace(/^CCG Singles: Magic \[[^\]]+\]\s*/, '');
        cleanName = cleanName.replace(/\s*\([^)]*\)/g, '').trim();
        cleanName = cleanName.replace(/\s+\[FOIL\]$/i, '').trim();
        cleanName = cleanName.replace(/\s+FOIL$/i, '').trim();
        
        const isFoil = name.includes('[FOIL]') || name.includes(' FOIL') || name.includes('(FOIL)');
        let condition = 'Near Mint';
        if (name.includes('Borderless')) condition = 'Borderless';
        if (name.includes('Showcase')) condition = 'Showcase';
        if (name.includes('Extended Art')) condition = 'Extended Art';
        if (name.includes('Retro Frame')) condition = 'Retro Frame';
        if (name.includes('Surge Foil')) condition = 'Surge Foil';
        if (name.includes('Rainbow Foil')) condition = 'Rainbow Foil';
        if (name.includes('Foil Etched')) condition = 'Foil Etched';
        
        if (isFoil && !condition.includes('Foil')) condition = condition + ' Foil';
        if (isFoil && condition === 'Near Mint') condition = 'Foil';
        
        return { name: cleanName, set: set, condition: condition, isBulk: false, quantity: qty, price: price / qty, totalPrice: price };
    }
    
    // Handle "CCG Singles: [Other]"
    if (name.startsWith('CCG Singles:')) {
        const parts = name.split(':');
        if (parts.length > 1) {
            const rest = parts.slice(1).join(':').trim();
            const setMatch = rest.match(/\[([^\]]+)\]/);
            const set = setMatch ? setMatch[1] : 'Unknown';
            let cleanName = rest.replace(/\[[^\]]+\]\s*/, '').trim();
            cleanName = cleanName.replace(/\s*\([^)]*\)/g, '').trim();
            return { name: cleanName || name, set: set, condition: 'Near Mint', isBulk: false, quantity: qty, price: price / qty, totalPrice: price };
        }
    }
    
    // Fallback
    let cleanName = name.replace(/\s*\([^)]*\)/g, '').trim();
    cleanName = cleanName.replace(/\s+\[[^\]]+\]$/, '').trim();
    return { name: cleanName || name, set: 'Unknown', condition: 'Near Mint', isBulk: false, quantity: qty, price: price / qty, totalPrice: price };
}

/**
 * Import TCGplayer inventory CSV - UPDATED FOR YOUR FORMAT
 */
function importTCGplayerCSV(csvText) {
    console.log('=== STARTING CSV IMPORT ===');
    console.log('CSV length:', csvText.length);
    
    const lines = csvText.split('\n').filter(line => line.trim());
    console.log('Total lines:', lines.length);
    
    if (lines.length < 2) {
        throw new Error('CSV appears to be empty');
    }
    
    // Show first line
    console.log('First line:', lines[0].substring(0, 300));
    
    // Detect delimiter - YOUR FILE USES TABS
    const firstLine = lines[0];
    const hasTabs = firstLine.includes('\t');
    const hasCommas = firstLine.includes(',');
    
    console.log('Has tabs:', hasTabs);
    console.log('Has commas:', hasCommas);
    
    let delimiter = ',';
    if (hasTabs && !hasCommas) delimiter = '\t';
    else if (hasTabs && hasCommas) {
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        delimiter = tabCount > commaCount ? '\t' : ',';
    }
    console.log('Using delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
    
    // Parse headers
    let headers;
    if (delimiter === '\t') {
        headers = firstLine.split('\t').map(h => h.trim().replace(/^"|"$/g, ''));
    } else {
        headers = parseCSVLine(firstLine);
    }
    console.log('Headers found:', headers);
    console.log('Header count:', headers.length);
    
    // Find columns - EXACT MATCH FOR YOUR FORMAT
    let nameCol = -1, addQtyCol = -1, totalQtyCol = -1, setCol = -1, condCol = -1, priceCol = -1;
    let marketPriceCol = -1, lowPriceCol = -1;
    
    headers.forEach((h, i) => {
        const clean = h.trim();
        console.log(`Header ${i}: "${clean}"`);
        
        // Exact matches for your headers
        if (clean === 'Product Name') {
            nameCol = i;
            console.log(`  → Found Product Name at index ${i}`);
        }
        if (clean === 'Add to Quantity') {
            addQtyCol = i;
            console.log(`  → Found Add to Quantity at index ${i}`);
        }
        if (clean === 'Total Quantity') {
            totalQtyCol = i;
            console.log(`  → Found Total Quantity at index ${i}`);
        }
        if (clean === 'Set Name') {
            setCol = i;
            console.log(`  → Found Set Name at index ${i}`);
        }
        if (clean === 'Condition') {
            condCol = i;
            console.log(`  → Found Condition at index ${i}`);
        }
        if (clean === 'My Store Price') {
            priceCol = i;
            console.log(`  → Found My Store Price at index ${i}`);
        }
        if (clean === 'TCG Market Price') {
            marketPriceCol = i;
            console.log(`  → Found TCG Market Price at index ${i}`);
        }
        if (clean === 'TCG Low Price') {
            lowPriceCol = i;
            console.log(`  → Found TCG Low Price at index ${i}`);
        }
    });
    
    // Fallback to TCG Market Price if My Store Price not found
    if (priceCol === -1 && marketPriceCol !== -1) {
        priceCol = marketPriceCol;
        console.log('Using TCG Market Price as fallback price column');
    }
    if (priceCol === -1 && lowPriceCol !== -1) {
        priceCol = lowPriceCol;
        console.log('Using TCG Low Price as fallback price column');
    }
    
    console.log('Column mapping:', { nameCol, addQtyCol, totalQtyCol, setCol, condCol, priceCol });
    
    if (nameCol === -1) {
        console.error('Name column not found! Available headers:', headers);
        throw new Error('Could not find "Product Name" column. Found headers: ' + headers.join(', '));
    }
    
    // PRIORITY: Use Add to Quantity first, then Total Quantity
    let qtyCol = addQtyCol !== -1 ? addQtyCol : (totalQtyCol !== -1 ? totalQtyCol : -1);
    if (qtyCol === -1) {
        console.error('Quantity column not found! Available headers:', headers);
        throw new Error('Could not find quantity column (Add to Quantity or Total Quantity)');
    }
    
    console.log('Using name column:', nameCol, '(Product Name)');
    console.log('Using quantity column:', qtyCol, qtyCol === addQtyCol ? '(Add to Quantity)' : '(Total Quantity)');
    
    let added = 0, skipped = 0;
    const results = [];
    
    // Show first 3 data rows for debugging
    console.log('--- First 3 data rows ---');
    for (let i = 1; i < Math.min(4, lines.length); i++) {
        let cols;
        if (delimiter === '\t') {
            cols = lines[i].split('\t').map(c => c.trim());
        } else {
            cols = parseCSVLine(lines[i]);
        }
        console.log(`Row ${i}:`, cols);
    }
    
    for (let i = 1; i < lines.length; i++) {
        try {
            let cols;
            if (delimiter === '\t') {
                cols = lines[i].split('\t').map(c => c.trim());
            } else {
                cols = parseCSVLine(lines[i]);
            }
            
            // Skip rows that don't have enough columns
            const maxCol = Math.max(nameCol, qtyCol);
            if (cols.length <= maxCol) { 
                skipped++; 
                continue; 
            }
            
            let cardName = cols[nameCol]?.trim() || '';
            if (!cardName) { 
                skipped++; 
                continue; 
            }
            
            // Clean the card name (remove extra info)
            cardName = cleanCardName(cardName);
            
            // Get quantity - prioritize Add to Quantity
            const qtyStr = cols[qtyCol]?.trim() || '0';
            const qty = parseInt(qtyStr.replace(/,/g, '')) || 0;
            
            if (qty <= 0) { 
                skipped++; 
                continue; 
            }
            
            // Get other details
            const setName = setCol !== -1 && cols[setCol] ? cols[setCol].trim() || 'Unknown' : 'Unknown';
            const condition = condCol !== -1 && cols[condCol] ? cols[condCol].trim() || 'Near Mint' : 'Near Mint';
            const price = priceCol !== -1 ? parseFloat(cols[priceCol]) || 0 : 0;
            
            // Check if foil is mentioned in the condition or name
            const isFoil = condition.includes('Foil') || cardName.includes('Foil') || cardName.includes('[FOIL]');
            const foil = isFoil ? 'Yes' : '';
            
            // Try to extract rarity from condition or name
            const rarityMatch = condition.match(/\b(Common|Uncommon|Rare|Mythic)\b/i);
            const rarity = rarityMatch ? rarityMatch[1] : '';
            
            console.log(`Adding: ${qty}x ${cardName} (${setName}, ${condition})`);
            
            const result = addCard({
                cardName: cardName,
                setName: setName,
                number: '',
                foil: foil,
                rarity: rarity,
                condition: condition,
                quantity: qty,
                location: 'Store',
                cost: 0,
                sellPrice: price
            });
            
            added += qty;
            results.push(result);
            
        } catch (e) {
            console.error('Error on row', i, ':', e);
            skipped++;
        }
    }
    
    console.log('=== IMPORT COMPLETE ===');
    console.log('Added:', added, 'cards');
    console.log('Skipped:', skipped, 'rows');
    console.log('Total inventory:', inventory.length, 'cards');
    
    saveInventory();
    return { added, skipped, results };
}

/**
 * Import sold cards CSV - IMPROVED MATCHING
 */
/**
 * Import sold cards CSV - IMPROVED with bulk recording
 */
function importSoldCardsCSV(csvText) {
    console.log('=== STARTING SOLD CARDS IMPORT ===');
    console.log('CSV length:', csvText.length);
    
    const lines = csvText.split('\n').filter(line => line.trim());
    console.log('Total lines:', lines.length);
    
    if (lines.length < 2) {
        throw new Error('CSV appears to be empty');
    }
    
    // Detect delimiter
    const firstLine = lines[0];
    const hasTabs = firstLine.includes('\t');
    const hasCommas = firstLine.includes(',');
    let delimiter = ',';
    if (hasTabs && !hasCommas) delimiter = '\t';
    else if (hasTabs && hasCommas) {
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        delimiter = tabCount > commaCount ? '\t' : ',';
    }
    console.log('Using delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
    
    // Parse headers
    let headers;
    if (delimiter === '\t') {
        headers = firstLine.split('\t').map(h => h.trim().replace(/^"|"$/g, ''));
    } else {
        headers = parseCSVLine(firstLine);
    }
    console.log('Headers found:', headers);
    
    // Find columns
    let nameCol = -1, qtyCol = -1, priceCol = -1, transPriceCol = -1;
    
    headers.forEach((h, i) => {
        const lower = h.toLowerCase();
        if (lower === 'name' || lower.includes('item name') || lower.includes('product name')) nameCol = i;
        if (lower === 'quantity' || lower === 'qty') qtyCol = i;
        if (lower === 'price' || lower.includes('transaction price')) {
            if (lower.includes('transaction')) transPriceCol = i;
            else priceCol = i;
        }
    });
    
    const finalPriceCol = transPriceCol !== -1 ? transPriceCol : priceCol;
    if (nameCol === -1) throw new Error('Could not find card name column');
    if (qtyCol === -1) console.warn('No quantity column found, defaulting to 1');
    
    // Show sample rows for debugging
    console.log('--- Sample rows ---');
    for (let i = 1; i < Math.min(5, lines.length); i++) {
        let cols;
        if (delimiter === '\t') {
            cols = lines[i].split('\t').map(c => c.trim());
        } else {
            cols = parseCSVLine(lines[i]);
        }
        if (cols.length > nameCol) {
            console.log(`Row ${i}: Name="${cols[nameCol]}"`);
        }
    }
    
    let sold = 0, skipped = 0, totalRevenue = 0, matched = 0, notFound = 0, insufficientStock = 0, bulkSales = 0;
    let fuzzyMatches = 0;
    let bulkTransactions = []; // Track bulk sales for later review
    
    for (let i = 1; i < lines.length; i++) {
        try {
            let cols;
            if (delimiter === '\t') {
                cols = lines[i].split('\t').map(c => c.trim());
            } else {
                cols = parseCSVLine(lines[i]);
            }
            
            if (cols.length <= nameCol) { 
                skipped++; 
                continue; 
            }
            
            let name = cols[nameCol]?.trim() || '';
            if (!name) { 
                skipped++; 
                continue; 
            }
            
            let qty = 1;
            if (qtyCol !== -1 && cols[qtyCol]) {
                qty = parseInt(cols[qtyCol].replace(/,/g, '')) || 1;
            }
            
            let totalPrice = 0;
            if (finalPriceCol !== -1 && cols[finalPriceCol]) {
                totalPrice = parseFloat(cols[finalPriceCol].replace(/[$,]/g, '')) || 0;
            }
            
            // Parse the sold card name
            const parsed = parseSoldCardName(name, qty, totalPrice);
            
            // Debug first few rows
            if (i <= 5) {
                console.log(`Row ${i}: "${name}" → "${parsed.name}" (${parsed.set}, ${parsed.condition})`);
            }
            
            // HANDLE BULK SALES - RECORD THEM AS TRANSACTIONS
            if (parsed.isBulk) {
                bulkSales++;
                const description = `${qty}x Bulk Magic Singles sold (bulk)`;
                // Create a transaction for the bulk sale
                addTransaction('out', description, totalPrice, 0);
                // Store for bulk review
                bulkTransactions.push({
                    description: description,
                    amount: totalPrice,
                    qty: qty,
                    timestamp: new Date().toISOString()
                });
                console.log(`📦 Bulk sale recorded: ${qty}x Bulk Magic Singles for $${totalPrice.toFixed(2)}`);
                continue;
            }
            
            // Try to find the card in inventory - EXACT MATCH first
            let card = inventory.find(c => 
                c.cardName?.toLowerCase() === parsed.name.toLowerCase() && 
                c.condition === parsed.condition &&
                c.setName === parsed.set
            );
            
            // If exact match fails, try fuzzy match (just by name, ignoring set and condition)
            if (!card) {
                card = inventory.find(c => 
                    c.cardName?.toLowerCase() === parsed.name.toLowerCase()
                );
                
                if (card) {
                    fuzzyMatches++;
                    console.log(`  → Fuzzy match: "${parsed.name}" matched to "${card.cardName}" (different set/condition)`);
                }
            }
            
            // If still no match, try partial match
            if (!card) {
                card = inventory.find(c => 
                    c.cardName?.toLowerCase().includes(parsed.name.toLowerCase()) ||
                    parsed.name.toLowerCase().includes(c.cardName?.toLowerCase())
                );
                
                if (card) {
                    fuzzyMatches++;
                    console.log(`  → Partial match: "${parsed.name}" matched to "${card.cardName}"`);
                }
            }
            
            if (card) {
                if (card.quantity >= parsed.quantity) {
                    card.quantity -= parsed.quantity;
                    totalRevenue += parsed.totalPrice;
                    const cost = card.cost * parsed.quantity;
                    addTransaction('out', `${parsed.quantity}x ${parsed.name} sold (import)`, parsed.totalPrice, cost);
                    
                    if (card.quantity === 0) {
                        const index = inventory.indexOf(card);
                        if (index > -1) inventory.splice(index, 1);
                    }
                    sold += parsed.quantity;
                    matched++;
                } else {
                    console.log(`  → Insufficient stock for ${parsed.name} (need ${parsed.quantity}, have ${card.quantity})`);
                    insufficientStock++;
                }
            } else {
                console.log(`  → Not found: ${parsed.name} (${parsed.set}, ${parsed.condition})`);
                notFound++;
            }
            
        } catch (e) {
            console.error('Error on row', i, ':', e);
            skipped++;
        }
    }
    
    console.log('=== SOLD IMPORT COMPLETE ===');
    console.log('Sold:', sold, 'cards');
    console.log('Revenue: $' + totalRevenue.toFixed(2));
    console.log('Matched:', matched, 'cards');
    console.log('Fuzzy matches:', fuzzyMatches);
    console.log('Not found:', notFound, 'cards');
    console.log('Insufficient stock:', insufficientStock);
    console.log('Bulk sales recorded:', bulkSales);
    console.log('Bulk transactions created:', bulkTransactions.length);
    
    saveInventory();
    return { sold, skipped, totalRevenue, matched, notFound, insufficientStock, bulkSales, fuzzyMatches, bulkTransactions };
}