// Wait for wealthica.js to load
var addon = new Addon();

var logEl = document.getElementById('log');
var sheetIdInput = document.getElementById('sheetId');
var options = {};

function log(msg, className) {
  className = className || '';
  var time = new Date().toLocaleTimeString();
  var div = document.createElement('div');
  div.className = className;
  div.textContent = '[' + time + '] ' + msg;
  logEl.insertBefore(div, logEl.firstChild);
}

// Initialize addon
addon.on('init', function (opts) {
  options = opts;
  log('✓ Addon initialized', 'success');
  
  // Load saved sheet ID
  if (opts.data && opts.data.sheetId) {
    sheetIdInput.value = opts.data.sheetId;
    log('Loaded saved Sheet ID: ' + opts.data.sheetId);
  }
});

addon.on('reload', function () {
  log('Dashboard reloaded');
});

addon.on('update', function (opts) {
  options = opts;
  log('Filters updated');
});

// Save configuration
document.getElementById('save-config').addEventListener('click', function() {
  var sheetId = sheetIdInput.value.trim();
  if (!sheetId) {
    log('⚠ Please enter a Sheet ID', 'error');
    return;
  }
  
  addon.saveData({ sheetId: sheetId }).then(function() {
    log('✓ Configuration saved', 'success');
  }).catch(function(err) {
    log('✗ Error saving: ' + err.message, 'error');
  });
});

// Export transactions
document.getElementById('export-transactions').addEventListener('click', function() {
  var sheetId = sheetIdInput.value.trim();
  if (!sheetId) {
    log('⚠ Please enter and save Sheet ID first', 'error');
    return;
  }
  
  log('Fetching transactions...');
  
  var query = {
    from: options.fromDate || '2024-01-01',
    to: options.toDate || new Date().toISOString().split('T')[0]
  };
  
  addon.api.getTransactions(query).then(function(response) {
    var transactions = response.data || response;
    log('✓ Fetched ' + transactions.length + ' transactions', 'success');
    
    // Format for Google Sheets
    var headers = [['Date', 'Type', 'Description', 'Symbol', 'Quantity', 'Price', 'Amount', 'Currency', 'Account', 'Institution']];
    
    var rows = transactions.map(function(tx) {
      var date = tx.date || new Date(tx.origin_date).toISOString().split('T')[0];
      return [
        date,
        tx.type || '',
        tx.description || '',
        tx.symbol || tx.ticker || '',
        tx.quantity || '',
        tx.price || '',
        tx.currency_amount || tx.amount || '',
        tx.currency || '',
        tx.account_id || '',
        tx.institution || ''
      ];
    });
    
    var allRows = headers.concat(rows);
    
    return sendToGoogleSheets(sheetId, 'Transactions!A1', allRows).then(function() {
      log('✓ Exported ' + rows.length + ' transactions to Sheet', 'success');
    });
  }).catch(function(err) {
    log('✗ Error: ' + err.message, 'error');
    console.error(err);
  });
});

// Export positions
document.getElementById('export-positions').addEventListener('click', function() {
  var sheetId = sheetIdInput.value.trim();
  if (!sheetId) {
    log('⚠ Please enter and save Sheet ID first', 'error');
    return;
  }
  
  log('Fetching positions...');
  
  var query = {
    groups: options.groupsFilter,
    institutions: options.institutionsFilter
  };
  
  addon.api.getPositions(query).then(function(response) {
    var positions = response.data || response;
    log('✓ Fetched ' + positions.length + ' positions', 'success');
    
    var headers = [['Symbol', 'Name', 'Type', 'Quantity', 'Book Value', 'Market Value', 'Currency', 'Institution']];
    
    var rows = positions.map(function(pos) {
      return [
        (pos.security && pos.security.symbol) || pos.symbol || '',
        (pos.security && pos.security.name) || pos.name || '',
        (pos.security && pos.security.type) || pos.type || '',
        pos.quantity || '',
        pos.book_value || '',
        pos.market_value || pos.value || '',
        (pos.security && pos.security.currency) || pos.currency || '',
        pos.institution || ''
      ];
    });
    
    var allRows = headers.concat(rows);
    
    return sendToGoogleSheets(sheetId, 'Positions!A1', allRows).then(function() {
      log('✓ Exported ' + rows.length + ' positions to Sheet', 'success');
    });
  }).catch(function(err) {
    log('✗ Error: ' + err.message, 'error');
    console.error(err);
  });
});

// Send to Google Sheets via your backend
function sendToGoogleSheets(sheetId, range, values) {
  // REPLACE THIS URL with your backend endpoint (see Step 3)
  var backendUrl = 'YOUR_BACKEND_URL_HERE';
  
  return fetch(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheetId: sheetId, range: range, values: values })
  }).then(function(response) {
    if (!response.ok) {
      return response.text().then(function(text) {
        throw new Error('Backend error: ' + text);
      });
    }
    return response.json();
  });
}
