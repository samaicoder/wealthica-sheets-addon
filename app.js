// Initialize Wealthica addon
var addon = new Addon();

var logEl = document.getElementById('log');
var statusEl = document.getElementById('status');
var btnTransactions = document.getElementById('export-transactions');
var btnPositions = document.getElementById('export-positions');
var btnAll = document.getElementById('export-all');

var options = {};

function log(msg, className) {
  className = className || '';
  var time = new Date().toLocaleTimeString();
  var div = document.createElement('div');
  div.className = 'log-entry ' + className;
  div.textContent = '[' + time + '] ' + msg;
  logEl.insertBefore(div, logEl.firstChild);
}

function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.parentElement.style.background = type === 'success' ? '#d4edda' : 
                                            type === 'error' ? '#f8d7da' : '#fff3cd';
  statusEl.parentElement.style.borderColor = type === 'success' ? '#28a745' : 
                                             type === 'error' ? '#dc3545' : '#ffc107';
}

function enableButtons() {
  btnTransactions.disabled = false;
  btnPositions.disabled = false;
  btnAll.disabled = false;
}

function disableButtons() {
  btnTransactions.disabled = true;
  btnPositions.disabled = true;
  btnAll.disabled = true;
}

// Initialize addon
addon.on('init', function (opts) {
  options = opts;
  log('✓ Addon connected to Wealthica', 'success');
  setStatus('Ready to export', 'success');
  enableButtons();
});

addon.on('reload', function () {
  log('Dashboard reloaded', 'info');
});

addon.on('update', function (opts) {
  options = opts;
  log('Filters updated', 'info');
});

// Export transactions
btnTransactions.addEventListener('click', function() {
  disableButtons();
  setStatus('Fetching transactions...', 'info');
  log('Starting transaction export...');
  
  var query = {
    from: options.fromDate || '2024-01-01',
    to: options.toDate || new Date().toISOString().split('T')[0]
  };
  
  addon.api.getTransactions(query).then(function(response) {
    var transactions = response.data || response;
    log('✓ Fetched ' + transactions.length + ' transactions', 'success');
    
    if (transactions.length === 0) {
      log('⚠ No transactions found for this date range', 'error');
      setStatus('No transactions to export', 'error');
      enableButtons();
      return;
    }
    
    // Format data for Excel
    var excelData = transactions.map(function(tx) {
      var date = tx.date || (tx.origin_date ? new Date(tx.origin_date).toISOString().split('T')[0] : '');
      return {
        'Date': date,
        'Type': tx.type || '',
        'Description': tx.description || '',
        'Symbol': tx.symbol || tx.ticker || '',
        'Quantity': tx.quantity || '',
        'Price': tx.price || '',
        'Amount': tx.currency_amount || tx.amount || '',
        'Currency': tx.currency || '',
        'Account': tx.account_id || '',
        'Institution': tx.institution || ''
      };
    });
    
    downloadExcel(excelData, 'Wealthica_Transactions');
    log('✓ Excel file downloaded: Wealthica_Transactions.xlsx', 'success');
    setStatus('Export complete!', 'success');
    enableButtons();
    
  }).catch(function(err) {
    log('✗ Error fetching transactions: ' + err.message, 'error');
    setStatus('Export failed', 'error');
    console.error(err);
    enableButtons();
  });
});

// Export positions
btnPositions.addEventListener('click', function() {
  disableButtons();
  setStatus('Fetching positions...', 'info');
  log('Starting positions export...');
  
  var query = {
    groups: options.groupsFilter,
    institutions: options.institutionsFilter
  };
  
  addon.api.getPositions(query).then(function(response) {
    var positions = response.data || response;
    log('✓ Fetched ' + positions.length + ' positions', 'success');
    
    if (positions.length === 0) {
      log('⚠ No positions found', 'error');
      setStatus('No positions to export', 'error');
      enableButtons();
      return;
    }
    
    // Format data for Excel
    var excelData = positions.map(function(pos) {
      return {
        'Symbol': (pos.security && pos.security.symbol) || pos.symbol || '',
        'Name': (pos.security && pos.security.name) || pos.name || '',
        'Type': (pos.security && pos.security.type) || pos.type || '',
        'Quantity': pos.quantity || '',
        'Book Value': pos.book_value || '',
        'Market Value': pos.market_value || pos.value || '',
        'Gain/Loss': pos.gain_amount || '',
        'Gain/Loss %': pos.gain_percent || '',
        'Currency': (pos.security && pos.security.currency) || pos.currency || '',
        'Institution': pos.institution || ''
      };
    });
    
    downloadExcel(excelData, 'Wealthica_Positions');
    log('✓ Excel file downloaded: Wealthica_Positions.xlsx', 'success');
    setStatus('Export complete!', 'success');
    enableButtons();
    
  }).catch(function(err) {
    log('✗ Error fetching positions: ' + err.message, 'error');
    setStatus('Export failed', 'error');
    console.error(err);
    enableButtons();
  });
});

// Export all data (transactions + positions in one file)
btnAll.addEventListener('click', function() {
  disableButtons();
  setStatus('Fetching all data...', 'info');
  log('Starting full export (transactions + positions)...');
  
  var transactionsQuery = {
    from: options.fromDate || '2024-01-01',
    to: options.toDate || new Date().toISOString().split('T')[0]
  };
  
  var positionsQuery = {
    groups: options.groupsFilter,
    institutions: options.institutionsFilter
  };
  
  Promise.all([
    addon.api.getTransactions(transactionsQuery),
    addon.api.getPositions(positionsQuery)
  ]).then(function(results) {
    var transactions = results[0].data || results[0];
    var positions = results[1].data || results[1];
    
    log('✓ Fetched ' + transactions.length + ' transactions', 'success');
    log('✓ Fetched ' + positions.length + ' positions', 'success');
    
    // Format transactions
    var transactionsData = transactions.map(function(tx) {
      var date = tx.date || (tx.origin_date ? new Date(tx.origin_date).toISOString().split('T')[0] : '');
      return {
        'Date': date,
        'Type': tx.type || '',
        'Description': tx.description || '',
        'Symbol': tx.symbol || tx.ticker || '',
        'Quantity': tx.quantity || '',
        'Price': tx.price || '',
        'Amount': tx.currency_amount || tx.amount || '',
        'Currency': tx.currency || '',
        'Account': tx.account_id || '',
        'Institution': tx.institution || ''
      };
    });
    
    // Format positions
    var positionsData = positions.map(function(pos) {
      return {
        'Symbol': (pos.security && pos.security.symbol) || pos.symbol || '',
        'Name': (pos.security && pos.security.name) || pos.name || '',
        'Type': (pos.security && pos.security.type) || pos.type || '',
        'Quantity': pos.quantity || '',
        'Book Value': pos.book_value || '',
        'Market Value': pos.market_value || pos.value || '',
        'Gain/Loss': pos.gain_amount || '',
        'Gain/Loss %': pos.gain_percent || '',
        'Currency': (pos.security && pos.security.currency) || pos.currency || '',
        'Institution': pos.institution || ''
      };
    });
    
    downloadExcelMultiSheet({
      'Transactions': transactionsData,
      'Positions': positionsData
    }, 'Wealthica_Complete_Export');
    
    log('✓ Excel file downloaded: Wealthica_Complete_Export.xlsx', 'success');
    setStatus('Export complete!', 'success');
    enableButtons();
    
  }).catch(function(err) {
    log('✗ Error fetching data: ' + err.message, 'error');
    setStatus('Export failed', 'error');
    console.error(err);
    enableButtons();
  });
});

// Function to download single-sheet Excel file
function downloadExcel(data, filename) {
  var ws = XLSX.utils.json_to_sheet(data);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, filename + '.xlsx');
}

// Function to download multi-sheet Excel file
function downloadExcelMultiSheet(sheets, filename) {
  var wb = XLSX.utils.book_new();
  
  for (var sheetName in sheets) {
    if (sheets.hasOwnProperty(sheetName)) {
      var ws = XLSX.utils.json_to_sheet(sheets[sheetName]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  }
  
  XLSX.writeFile(wb, filename + '.xlsx');
}
