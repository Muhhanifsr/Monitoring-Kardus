/**
 * StockMonitor Pro — Main Application
 * Monitoring Stock Kardus & Palet Besi
 * Integrated with Google Spreadsheet via Apps Script
 */

(function () {
    'use strict';

    // ============================================
    // Configuration & State
    // ============================================
    const CONFIG = {
        STORAGE_KEY_URL: 'stockmonitor_webapp_url',
        STORAGE_KEY_STOCK: 'stockmonitor_stock_data',
        STORAGE_KEY_HISTORY: 'stockmonitor_history',
        STORAGE_KEY_WEEKLY: 'stockmonitor_weekly_stock',
        STORAGE_KEY_THEME: 'stockmonitor_theme',
    };

    const ITEMS = [
        'Kardus Besar', 'Kardus Kecil',
        'Layer Besar', 'Layer Kecil',
        'Palet A1 ADM', 'Palet 3D FLOOR'
    ];

    // Default stock structure
    function getDefaultStock() {
        const stock = {};
        ITEMS.forEach(item => {
            stock[item] = { layak: 0, tidakLayak: 0 };
        });
        return stock;
    }

    let stockData = getDefaultStock();
    let transactionHistory = [];
    let weeklyData = [];
    let webAppUrl = '';

    // ============================================
    // DOM Elements
    // ============================================
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ============================================
    // Initialize
    // ============================================
    function init() {
        loadFromLocalStorage();
        setupNavigation();
        setupForms();
        setupSettings();
        setupMisc();
        setupThemeToggle();
        updateDashboard();
        renderRecentTransactions();
        renderHistory();
        updateDateTime();
        setInterval(updateDateTime, 1000);

        // Animate stock values on load
        setTimeout(() => {
            animateStockValues();
        }, 300);
    }

    // ============================================
    // Local Storage
    // ============================================
    function loadFromLocalStorage() {
        try {
            const savedStock = localStorage.getItem(CONFIG.STORAGE_KEY_STOCK);
            if (savedStock) {
                const parsed = JSON.parse(savedStock);
                stockData = { ...getDefaultStock(), ...parsed };
            }

            const savedHistory = localStorage.getItem(CONFIG.STORAGE_KEY_HISTORY);
            if (savedHistory) {
                transactionHistory = JSON.parse(savedHistory);
            }

            const savedWeekly = localStorage.getItem(CONFIG.STORAGE_KEY_WEEKLY);
            if (savedWeekly) {
                weeklyData = JSON.parse(savedWeekly);
            }

            // Load saved theme
            const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEY_THEME);
            if (savedTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
                const icon = $('#themeIcon');
                if (icon) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                }
            }

            webAppUrl = localStorage.getItem(CONFIG.STORAGE_KEY_URL) || '';
            if (webAppUrl) {
                const urlInput = $('#inputWebAppUrl');
                if (urlInput) urlInput.value = webAppUrl;
                updateSyncStatus(true);
            } else {
                updateSyncStatus(false);
            }
        } catch (e) {
            console.error('Error loading from localStorage:', e);
        }
    }

    function saveToLocalStorage() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY_STOCK, JSON.stringify(stockData));
            localStorage.setItem(CONFIG.STORAGE_KEY_HISTORY, JSON.stringify(transactionHistory));
            localStorage.setItem(CONFIG.STORAGE_KEY_WEEKLY, JSON.stringify(weeklyData));
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    }

    // ============================================
    // Navigation
    // ============================================
    function setupNavigation() {
        const navLinks = $$('.nav-link-custom');
        const pages = $$('.page-content');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;

                // Update active nav
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Show page
                pages.forEach(p => p.classList.remove('active'));
                const targetPage = $(`#page-${page}`);
                if (targetPage) {
                    targetPage.classList.add('active');
                    // Re-trigger animation
                    targetPage.style.animation = 'none';
                    targetPage.offsetHeight; // force reflow
                    targetPage.style.animation = '';
                }

                // Update title
                const titles = {
                    dashboard: { title: 'Dashboard', sub: 'Overview stock & monitoring real-time' },
                    transaksi: { title: 'Transaksi', sub: 'Tambah atau kurangi stock' },
                    riwayat: { title: 'Riwayat Transaksi', sub: 'Log seluruh transaksi masuk & keluar' },
                    stockmingguan: { title: 'Stock Mingguan', sub: 'Snapshot sisa stock per minggu' },
                    pengaturan: { title: 'Pengaturan', sub: 'Konfigurasi integrasi Spreadsheet' },
                };
                if (titles[page]) {
                    $('#pageTitle').textContent = titles[page].title;
                    $('#pageSubtitle').textContent = titles[page].sub;
                }

                // Close sidebar on mobile
                closeSidebar();

                // Refresh specific pages
                if (page === 'dashboard') {
                    updateDashboard();
                    renderRecentTransactions();
                } else if (page === 'riwayat') {
                    renderHistory();
                } else if (page === 'stockmingguan') {
                    renderWeeklyStock();
                }
            });
        });

        // Sidebar toggle
        const sidebarToggle = $('#sidebarToggle');
        const sidebar = $('#sidebar');
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebarOverlay';
        document.body.appendChild(overlay);

        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', closeSidebar);

        // View all history button on dashboard
        const btnViewAll = $('#btnViewAllHistory');
        if (btnViewAll) {
            btnViewAll.addEventListener('click', (e) => {
                e.preventDefault();
                const riwayatNav = $('#nav-riwayat');
                if (riwayatNav) riwayatNav.click();
            });
        }
    }

    function closeSidebar() {
        const sidebar = $('#sidebar');
        const overlay = $('#sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    // ============================================
    // Dashboard Updates
    // ============================================
    function updateDashboard() {
        // Update stock cards
        updateStockCard('KardusBesar', 'Kardus Besar');
        updateStockCard('KardusKecil', 'Kardus Kecil');
        updateStockCard('LayerBesar', 'Layer Besar');
        updateStockCard('LayerKecil', 'Layer Kecil');

        // Update palet cards
        updatePaletCard('PaletA1', 'Palet A1 ADM');
        updatePaletCard('Palet3D', 'Palet 3D FLOOR');
    }

    function updateStockCard(idSuffix, itemName) {
        const data = stockData[itemName] || { layak: 0, tidakLayak: 0 };
        const total = data.layak + data.tidakLayak;

        const stockEl = $(`#stock${idSuffix}`);
        const layakEl = $(`#layak${idSuffix}`);
        const tidakLayakEl = $(`#tidakLayak${idSuffix}`);

        if (stockEl) animateNumber(stockEl, total);
        if (layakEl) animateNumber(layakEl, data.layak);
        if (tidakLayakEl) animateNumber(tidakLayakEl, data.tidakLayak);
    }

    function updatePaletCard(idSuffix, itemName) {
        const data = stockData[itemName] || { layak: 0, tidakLayak: 0 };
        const total = data.layak + data.tidakLayak;

        const totalEl = $(`#total${idSuffix}`);
        const layakEl = $(`#layak${idSuffix}`);
        const tidakLayakEl = $(`#tidakLayak${idSuffix}`);
        const barEl = $(`#bar${idSuffix}`);

        if (totalEl) animateNumber(totalEl, total);
        if (layakEl) animateNumber(layakEl, data.layak);
        if (tidakLayakEl) animateNumber(tidakLayakEl, data.tidakLayak);

        // Update progress bar (percentage of "layak" from total)
        if (barEl) {
            const percentage = total > 0 ? (data.layak / total) * 100 : 0;
            barEl.style.width = `${percentage}%`;
        }
    }

    function animateNumber(el, target) {
        const current = parseInt(el.textContent) || 0;
        if (current === target) return;

        const duration = 500;
        const steps = 20;
        const stepDuration = duration / steps;
        const increment = (target - current) / steps;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            const value = Math.round(current + increment * step);
            el.textContent = step === steps ? target : value;
            if (step >= steps) clearInterval(timer);
        }, stepDuration);
    }

    function animateStockValues() {
        $$('.stock-card, .palet-card').forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, i * 100);
        });
    }

    // ============================================
    // Transaction Forms
    // ============================================
    function setupForms() {
        // Tambah Stock
        const formTambah = $('#formTambahStock');
        if (formTambah) {
            formTambah.addEventListener('submit', (e) => {
                e.preventDefault();
                processTransaction('Masuk');
            });
        }

        // Kurangi Stock
        const formKurangi = $('#formKurangiStock');
        if (formKurangi) {
            formKurangi.addEventListener('submit', (e) => {
                e.preventDefault();
                processTransaction('Keluar');
            });
        }
    }

    function processTransaction(type) {
        const prefix = type === 'Masuk' ? 'tambah' : 'kurangi';
        const item = $(`#${prefix}Item`).value;
        const jumlah = parseInt($(`#${prefix}Jumlah`).value);
        const kondisi = $(`#${prefix}Kondisi`).value;
        const keterangan = $(`#${prefix}Keterangan`).value.trim();

        if (!item || !jumlah || jumlah < 1 || !kondisi) {
            showToast('Mohon lengkapi semua field yang diperlukan', 'error');
            return;
        }

        // Validate stock when reducing
        if (type === 'Keluar') {
            const currentStock = kondisi === 'Layak'
                ? stockData[item].layak
                : stockData[item].tidakLayak;
            if (jumlah > currentStock) {
                showToast(`Stock ${kondisi.toLowerCase()} ${item} tidak mencukupi! (tersedia: ${currentStock})`, 'error');
                return;
            }
        }

        // Update stock
        if (type === 'Masuk') {
            if (kondisi === 'Layak') {
                stockData[item].layak += jumlah;
            } else {
                stockData[item].tidakLayak += jumlah;
            }
        } else {
            if (kondisi === 'Layak') {
                stockData[item].layak -= jumlah;
            } else {
                stockData[item].tidakLayak -= jumlah;
            }
        }

        // Add to history
        const transaction = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            item: item,
            type: type,
            jumlah: jumlah,
            kondisi: kondisi,
            keterangan: keterangan || '-'
        };
        transactionHistory.unshift(transaction);

        // Save locally
        saveToLocalStorage();

        // Send to Spreadsheet
        sendToSpreadsheet(transaction);

        // Update UI
        updateDashboard();
        renderRecentTransactions();
        renderHistory();

        // Reset form
        $(`#form${type === 'Masuk' ? 'Tambah' : 'Kurangi'}Stock`).reset();

        showToast(`Berhasil ${type === 'Masuk' ? 'menambah' : 'mengurangi'} ${jumlah} ${item} (${kondisi})`, 'success');
    }

    // ============================================
    // Render Transactions
    // ============================================
    function renderRecentTransactions() {
        const tbody = $('#recentTransactionsBody');
        if (!tbody) return;

        const recent = transactionHistory.slice(0, 5);

        if (recent.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">
                <i class="fas fa-inbox fa-2x mb-2 d-block"></i>Belum ada transaksi</td></tr>`;
            return;
        }

        tbody.innerHTML = recent.map(t => `
            <tr style="animation: slideInRight 0.3s ease">
                <td>${formatDate(t.timestamp)}</td>
                <td><strong>${t.item}</strong></td>
                <td><span class="type-badge ${t.type.toLowerCase()}">${t.type === 'Masuk' ? '↑ Masuk' : '↓ Keluar'}</span></td>
                <td class="${t.type === 'Masuk' ? 'jumlah-masuk' : 'jumlah-keluar'}">${t.type === 'Masuk' ? '+' : '-'}${t.jumlah}</td>
                <td><span class="kondisi-badge ${t.kondisi === 'Layak' ? 'layak' : 'tidak-layak'}">${t.kondisi}</span></td>
                <td class="text-light">${escapeHtml(t.keterangan)}</td>
            </tr>
        `).join('');
    }

    function renderHistory() {
        const tbody = $('#historyBody');
        if (!tbody) return;

        const filterItem = ($('#filterItem') || {}).value || '';
        const filterTipe = ($('#filterTipe') || {}).value || '';

        let filtered = [...transactionHistory];

        if (filterItem) {
            filtered = filtered.filter(t => t.item === filterItem);
        }
        if (filterTipe) {
            filtered = filtered.filter(t => t.type === filterTipe);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-5">
                <i class="fas fa-inbox fa-3x mb-3 d-block opacity-50"></i>
                ${transactionHistory.length === 0 ? 'Belum ada riwayat transaksi' : 'Tidak ada transaksi yang cocok dengan filter'}</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map((t, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${formatDate(t.timestamp)}</td>
                <td><strong>${t.item}</strong></td>
                <td><span class="type-badge ${t.type.toLowerCase()}">${t.type === 'Masuk' ? '↑ Masuk' : '↓ Keluar'}</span></td>
                <td class="${t.type === 'Masuk' ? 'jumlah-masuk' : 'jumlah-keluar'}">${t.type === 'Masuk' ? '+' : '-'}${t.jumlah}</td>
                <td><span class="kondisi-badge ${t.kondisi === 'Layak' ? 'layak' : 'tidak-layak'}">${t.kondisi}</span></td>
                <td class="text-light">${escapeHtml(t.keterangan)}</td>
                <td>
                    <button class="btn-delete-row" data-id="${t.id}" title="Hapus transaksi ini">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Attach per-row delete handlers
        tbody.querySelectorAll('.btn-delete-row').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                showDeleteConfirmation('single', id);
            });
        });
    }

    // ============================================
    // Spreadsheet Integration
    // ============================================
    function sendToSpreadsheet(transaction) {
        if (!webAppUrl) return;

        showLoading(true);

        const payload = {
            action: 'addTransaction',
            data: {
                timestamp: transaction.timestamp,
                item: transaction.item,
                type: transaction.type,
                jumlah: transaction.jumlah,
                kondisi: transaction.kondisi,
                keterangan: transaction.keterangan,
                stockAfter: JSON.stringify(stockData)
            }
        };

        fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(() => {
            showLoading(false);
            updateSyncStatus(true);
        })
        .catch(err => {
            console.error('Spreadsheet sync error:', err);
            showLoading(false);
            updateSyncStatus(false);
            showToast('Gagal sinkronisasi ke Spreadsheet, data tersimpan lokal', 'error');
        });
    }

    function syncFromSpreadsheet() {
        if (!webAppUrl) {
            showToast('URL Web App belum dikonfigurasi', 'error');
            return;
        }

        showLoading(true);

        fetch(`${webAppUrl}?action=getStock`)
        .then(res => res.json())
        .then(data => {
            if (data && data.stock) {
                stockData = { ...getDefaultStock(), ...data.stock };
                saveToLocalStorage();
                updateDashboard();
                showToast('Data berhasil disinkronisasi dari Spreadsheet', 'success');
            }
            if (data && data.history) {
                transactionHistory = data.history;
                saveToLocalStorage();
                renderRecentTransactions();
                renderHistory();
            }
            showLoading(false);
            updateSyncStatus(true);
        })
        .catch(err => {
            console.error('Sync error:', err);
            showLoading(false);
            showToast('Gagal mengambil data dari Spreadsheet', 'error');
        });
    }

    // ============================================
    // Settings
    // ============================================
    function setupSettings() {
        const btnSave = $('#btnSaveUrl');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                const url = $('#inputWebAppUrl').value.trim();
                if (!url) {
                    showToast('Mohon masukkan URL Web App', 'error');
                    return;
                }
                webAppUrl = url;
                localStorage.setItem(CONFIG.STORAGE_KEY_URL, url);
                updateSyncStatus(true);
                showToast('URL berhasil disimpan! Mencoba sinkronisasi...', 'success');

                const statusEl = $('#connectionStatus');
                if (statusEl) {
                    statusEl.innerHTML = `<div class="d-flex align-items-center gap-2 text-success mt-2">
                        <i class="fas fa-check-circle"></i> Terhubung</div>`;
                }

                // Try initial sync
                syncFromSpreadsheet();
            });
        }

        // Copy script button
        const btnCopyScript = $('#btnCopyScript');
        if (btnCopyScript) {
            btnCopyScript.addEventListener('click', () => {
                const scriptModal = new bootstrap.Modal($('#modalScript'));
                $('#appsScriptCode').textContent = getAppsScriptCode();
                scriptModal.show();
            });
        }

        const btnCopyCode = $('#btnCopyCode');
        if (btnCopyCode) {
            btnCopyCode.addEventListener('click', () => {
                navigator.clipboard.writeText(getAppsScriptCode()).then(() => {
                    showToast('Kode berhasil disalin ke clipboard!', 'success');
                }).catch(() => {
                    // Fallback
                    const el = $('#appsScriptCode');
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);
                    document.execCommand('copy');
                    showToast('Kode berhasil disalin!', 'success');
                });
            });
        }
    }

    function getAppsScriptCode() {
        return `// =============================================
// StockMonitor Pro — Google Apps Script (with Weekly Stock)
// Tempel kode ini di Extensions > Apps Script
// pada Google Spreadsheet Anda
// =============================================

// Pastikan spreadsheet memiliki 3 sheet:
// Sheet 1: "Stock" (untuk data stock)
// Sheet 2: "Riwayat" (untuk log transaksi)
// Sheet 3: "StockMingguan" (untuk snapshot stock per minggu)

function doGet(e) {
  var action = e.parameter.action;
  
  if (action === 'getStock') {
    return getStockData();
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    
    if (payload.action === 'addTransaction') {
      return addTransaction(payload.data);
    }
    
    if (payload.action === 'addWeeklyStock') {
      return addWeeklyStock(payload.data);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function addTransaction(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Add to Riwayat sheet
  var riwayatSheet = ss.getSheetByName('Riwayat');
  if (!riwayatSheet) {
    riwayatSheet = ss.insertSheet('Riwayat');
    riwayatSheet.appendRow(['Timestamp', 'Item', 'Tipe', 'Jumlah', 'Kondisi', 'Keterangan']);
  }
  
  riwayatSheet.appendRow([
    new Date(data.timestamp),
    data.item,
    data.type,
    data.jumlah,
    data.kondisi,
    data.keterangan
  ]);
  
  // Update Stock sheet
  updateStockSheet(data.stockAfter);
  
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateStockSheet(stockJson) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stockSheet = ss.getSheetByName('Stock');
  
  if (!stockSheet) {
    stockSheet = ss.insertSheet('Stock');
  }
  
  var stock = JSON.parse(stockJson);
  
  // Clear and rebuild
  stockSheet.clear();
  stockSheet.appendRow(['Item', 'Layak', 'Tidak Layak', 'Total']);
  
  var items = Object.keys(stock);
  items.forEach(function(item) {
    var layak = stock[item].layak || 0;
    var tidakLayak = stock[item].tidakLayak || 0;
    stockSheet.appendRow([item, layak, tidakLayak, layak + tidakLayak]);
  });
  
  // Auto-resize columns
  stockSheet.autoResizeColumns(1, 4);
}

function addWeeklyStock(rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('StockMingguan');
  
  if (!sheet) {
    sheet = ss.insertSheet('StockMingguan');
    sheet.appendRow(['Tanggal Catat', 'Tahun', 'Bulan', 'Minggu ke', 'Periode', 'Item', 'Layak', 'Tidak Layak', 'Total']);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  // Hapus baris lama dengan periode yang sama (overwrite)
  if (rows.length > 0) {
    var firstRow = rows[0];
    var lastDataRow = sheet.getLastRow();
    if (lastDataRow > 1) {
      var existingData = sheet.getRange(2, 1, lastDataRow - 1, 4).getValues();
      var rowsToDelete = [];
      for (var i = existingData.length - 1; i >= 0; i--) {
        if (existingData[i][1] == firstRow.year &&
            existingData[i][2] == firstRow.month &&
            existingData[i][3] == firstRow.week) {
          rowsToDelete.push(i + 2); // +2 karena header + 0-indexed
        }
      }
      rowsToDelete.forEach(function(r) { sheet.deleteRow(r); });
    }
  }
  
  rows.forEach(function(row) {
    sheet.appendRow([
      new Date(row.recordedAt),
      row.year,
      row.month,
      row.week,
      row.label,
      row.item,
      row.layak,
      row.tidakLayak,
      row.total
    ]);
  });
  
  sheet.autoResizeColumns(1, 9);
  
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getStockData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = { stock: {}, history: [] };
  
  // Read Stock
  var stockSheet = ss.getSheetByName('Stock');
  if (stockSheet && stockSheet.getLastRow() > 1) {
    var stockData = stockSheet.getRange(2, 1, stockSheet.getLastRow() - 1, 3).getValues();
    stockData.forEach(function(row) {
      result.stock[row[0]] = {
        layak: row[1] || 0,
        tidakLayak: row[2] || 0
      };
    });
  }
  
  // Read Riwayat
  var riwayatSheet = ss.getSheetByName('Riwayat');
  if (riwayatSheet && riwayatSheet.getLastRow() > 1) {
    var histData = riwayatSheet.getRange(2, 1, riwayatSheet.getLastRow() - 1, 6).getValues();
    histData.forEach(function(row) {
      result.history.push({
        id: new Date(row[0]).getTime(),
        timestamp: new Date(row[0]).toISOString(),
        item: row[1],
        type: row[2],
        jumlah: row[3],
        kondisi: row[4],
        keterangan: row[5] || '-'
      });
    });
    result.history.reverse();
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}`;
    }

    // ============================================
    // Weekly Stock Snapshot
    // ============================================

    const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];

    /**
     * Menghitung minggu ke-berapa dalam bulan (selalu 1–4)
     * Minggu 1 = tgl 1–7
     * Minggu 2 = tgl 8–14
     * Minggu 3 = tgl 15–21
     * Minggu 4 = tgl 22–akhir bulan
     * Reset ke Minggu 1 saat bulan berganti.
     */
    function getWeekOfMonth(date) {
        const day = date.getDate();
        if (day <= 7)  return 1;
        if (day <= 14) return 2;
        if (day <= 21) return 3;
        return 4; // tgl 22 s/d akhir bulan
    }

    /** Rentang tanggal minggu ini (mis: "22 Apr – 30 Apr 2026") */
    function getWeekDateRange(date) {
        const week = getWeekOfMonth(date);
        const year = date.getFullYear();
        const month = date.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        const weekRanges = [
            { start: 1,  end: 7 },
            { start: 8,  end: 14 },
            { start: 15, end: 21 },
            { start: 22, end: lastDay }
        ];
        const { start, end } = weekRanges[week - 1];
        return `${start} ${MONTHS_SHORT[month]} \u2013 ${end} ${MONTHS_SHORT[month]} ${year}`;
    }

    /** Label periode: "Minggu 1 - Apr 2026" */
    function getWeekLabel(date) {
        const week = getWeekOfMonth(date);
        return `Minggu ${week} - ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
    }

    /** Update info hero card (periode saat ini) */
    function updateWeeklyHero() {
        const now = new Date();
        const labelEl = $('#currentWeekLabel');
        const rangeEl = $('#currentWeekDateRange');
        const snapshotCountEl = $('#totalWeeklySnapshots');
        if (labelEl) labelEl.textContent = getWeekLabel(now);
        if (rangeEl) rangeEl.textContent = getWeekDateRange(now);
        if (snapshotCountEl) snapshotCountEl.textContent = weeklyData.length;
    }

    /** Simpan snapshot stock minggu ini */
    function saveWeeklySnapshot() {
        const now = new Date();
        const week = getWeekOfMonth(now);
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-indexed
        const label = getWeekLabel(now);

        // Cek apakah sudah ada snapshot minggu + bulan + tahun yang sama
        const existingIdx = weeklyData.findIndex(
            s => s.week === week && s.month === month && s.year === year
        );

        const snapshot = {
            id: Date.now(),
            year,
            month,
            week,
            label,
            dateRange: getWeekDateRange(now),
            recordedAt: now.toISOString(),
            stock: JSON.parse(JSON.stringify(stockData)) // deep copy
        };

        if (existingIdx !== -1) {
            // Overwrite snapshot yang sudah ada
            weeklyData[existingIdx] = snapshot;
            showToast(`Snapshot ${label} diperbarui!`, 'success');
        } else {
            weeklyData.unshift(snapshot);
            showToast(`Snapshot ${label} berhasil dicatat!`, 'success');
        }

        saveToLocalStorage();
        renderWeeklyStock();

        // Kirim ke spreadsheet
        sendWeeklyToSpreadsheet(snapshot);
    }

    /** Kirim snapshot mingguan ke Google Spreadsheet */
    function sendWeeklyToSpreadsheet(snapshot) {
        if (!webAppUrl) return;
        const rows = [];
        ITEMS.forEach(item => {
            const s = snapshot.stock[item] || { layak: 0, tidakLayak: 0 };
            rows.push({
                recordedAt: snapshot.recordedAt,
                year: snapshot.year,
                month: snapshot.month,
                week: snapshot.week,
                label: snapshot.label,
                item,
                layak: s.layak,
                tidakLayak: s.tidakLayak,
                total: s.layak + s.tidakLayak
            });
        });

        const payload = { action: 'addWeeklyStock', data: rows };
        fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.error('Weekly sync error:', err));
    }

    /** Populate filter tahun berdasarkan data yang ada */
    function populateWeeklyYearFilter() {
        const select = $('#filterWeeklyYear');
        if (!select) return;
        const years = [...new Set(weeklyData.map(s => s.year))].sort((a, b) => b - a);
        // Simpan nilai terpilih
        const current = select.value;
        // Hapus semua kecuali opsi pertama (Semua Tahun)
        while (select.options.length > 1) select.remove(1);
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            select.appendChild(opt);
        });
        if (current) select.value = current;
    }

    /** Render summary cards (stock terkini per item) dan tabel riwayat */
    function renderWeeklyStock() {
        updateWeeklyHero();
        populateWeeklyYearFilter();

        const filterMonth = parseInt(($('#filterWeeklyMonth') || {}).value) || 0;
        const filterYear = parseInt(($('#filterWeeklyYear') || {}).value) || 0;

        let filtered = [...weeklyData];
        if (filterMonth) filtered = filtered.filter(s => s.month === filterMonth);
        if (filterYear) filtered = filtered.filter(s => s.year === filterYear);

        // Render summary grid (latest snapshot per item dari filter)
        const summaryGrid = $('#weeklySummaryGrid');
        if (summaryGrid) {
            if (filtered.length === 0) {
                summaryGrid.innerHTML = '';
            } else {
                const latest = filtered[0]; // paling baru
                summaryGrid.innerHTML = `
                    <div class="weekly-summary-header">
                        <i class="fas fa-info-circle"></i>
                        Snapshot terbaru: <strong>${latest.label}</strong>
                        <span class="text-muted ms-2">dicatat ${formatDate(latest.recordedAt)}</span>
                    </div>
                    <div class="weekly-item-grid">
                        ${ITEMS.map(item => {
                            const s = latest.stock[item] || { layak: 0, tidakLayak: 0 };
                            const total = s.layak + s.tidakLayak;
                            const pct = total > 0 ? Math.round((s.layak / total) * 100) : 0;
                            return `
                            <div class="weekly-item-card">
                                <div class="weekly-item-name">${item}</div>
                                <div class="weekly-item-total">${total}</div>
                                <div class="weekly-item-detail">
                                    <span class="wi-layak"><i class="fas fa-check-circle"></i> ${s.layak}</span>
                                    <span class="wi-tidak"><i class="fas fa-times-circle"></i> ${s.tidakLayak}</span>
                                </div>
                                <div class="weekly-item-bar">
                                    <div class="weekly-item-bar-fill" style="width:${pct}%"></div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>`;
            }
        }

        // Render tabel
        const tbody = $('#weeklyTableBody');
        if (!tbody) return;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5">
                <i class="fas fa-calendar-times fa-3x mb-3 d-block opacity-50"></i>
                ${weeklyData.length === 0
                    ? 'Belum ada snapshot. Klik "Catat Stock Minggu Ini" untuk mulai.'
                    : 'Tidak ada data untuk filter yang dipilih.'}
            </td></tr>`;
            return;
        }

        const rows = [];
        filtered.forEach(snapshot => {
            ITEMS.forEach(item => {
                const s = snapshot.stock[item] || { layak: 0, tidakLayak: 0 };
                const total = s.layak + s.tidakLayak;
                rows.push(`
                    <tr>
                        <td>
                            <span class="week-period-label">${MONTHS_ID[snapshot.month - 1]} ${snapshot.year}</span>
                        </td>
                        <td>
                            <span class="week-badge week-badge-${snapshot.week}">Minggu ${snapshot.week}</span>
                        </td>
                        <td><strong class="text-light">${item}</strong></td>
                        <td class="jumlah-masuk">${s.layak}</td>
                        <td class="jumlah-keluar">${s.tidakLayak}</td>
                        <td><strong>${total}</strong></td>
                        <td class="text-muted" style="font-size:12px;">${formatDate(snapshot.recordedAt)}</td>
                    </tr>`);
            });
        });
        tbody.innerHTML = rows.join('');
    }

    /** Export CSV weekly */
    function exportWeeklyCSV() {
        if (weeklyData.length === 0) {
            showToast('Tidak ada data untuk di-export', 'error');
            return;
        }
        const headers = ['Periode', 'Tahun', 'Bulan', 'Minggu ke', 'Item', 'Layak', 'Tidak Layak', 'Total', 'Dicatat'];
        const rows = [];
        weeklyData.forEach(snapshot => {
            ITEMS.forEach(item => {
                const s = snapshot.stock[item] || { layak: 0, tidakLayak: 0 };
                rows.push([
                    snapshot.label,
                    snapshot.year,
                    MONTHS_ID[snapshot.month - 1],
                    snapshot.week,
                    item,
                    s.layak,
                    s.tidakLayak,
                    s.layak + s.tidakLayak,
                    formatDate(snapshot.recordedAt)
                ]);
            });
        });
        let csv = headers.join(',') + '\n';
        rows.forEach(row => { csv += row.map(c => `"${c}"`).join(',') + '\n'; });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock_mingguan_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('File CSV Stock Mingguan berhasil di-download!', 'success');
    }

    // ============================================
    // Misc Setup
    // ============================================
    function setupMisc() {
        // Refresh button
        const btnRefresh = $('#btnRefresh');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => {
                const icon = btnRefresh.querySelector('i');
                icon.style.animation = 'spin 0.6s linear';
                setTimeout(() => {
                    icon.style.animation = '';
                }, 600);

                if (webAppUrl) {
                    syncFromSpreadsheet();
                } else {
                    updateDashboard();
                    renderRecentTransactions();
                    renderHistory();
                    showToast('Data lokal diperbarui', 'success');
                }
            });
        }

        // Filter handlers
        const filterItem = $('#filterItem');
        const filterTipe = $('#filterTipe');
        if (filterItem) filterItem.addEventListener('change', renderHistory);
        if (filterTipe) filterTipe.addEventListener('change', renderHistory);

        // Export CSV Riwayat
        const btnExport = $('#btnExportHistory');
        if (btnExport) {
            btnExport.addEventListener('click', exportCSV);
        }

        // Delete All History
        const btnDeleteAll = $('#btnDeleteAllHistory');
        if (btnDeleteAll) {
            btnDeleteAll.addEventListener('click', () => {
                if (transactionHistory.length === 0) {
                    showToast('Tidak ada riwayat untuk dihapus', 'error');
                    return;
                }
                showDeleteConfirmation('all');
            });
        }

        // === Weekly Stock ===
        const btnSaveWeekly = $('#btnSaveWeeklySnapshot');
        if (btnSaveWeekly) {
            btnSaveWeekly.addEventListener('click', () => {
                saveWeeklySnapshot();
            });
        }

        const filterWeeklyMonth = $('#filterWeeklyMonth');
        const filterWeeklyYear = $('#filterWeeklyYear');
        if (filterWeeklyMonth) filterWeeklyMonth.addEventListener('change', renderWeeklyStock);
        if (filterWeeklyYear) filterWeeklyYear.addEventListener('change', renderWeeklyStock);

        const btnExportWeekly = $('#btnExportWeekly');
        if (btnExportWeekly) btnExportWeekly.addEventListener('click', exportWeeklyCSV);
    }

    // ============================================
    // Theme Toggle
    // ============================================
    function setupThemeToggle() {
        const btn = $('#btnThemeToggle');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const html = document.documentElement;
            const isLight = html.getAttribute('data-theme') === 'light';
            const icon = $('#themeIcon');

            if (isLight) {
                // Switch to dark
                html.removeAttribute('data-theme');
                localStorage.setItem(CONFIG.STORAGE_KEY_THEME, 'dark');
                if (icon) {
                    icon.style.transform = 'rotate(-180deg) scale(0)';
                    setTimeout(() => {
                        icon.classList.remove('fa-sun');
                        icon.classList.add('fa-moon');
                        icon.style.transform = 'rotate(0deg) scale(1)';
                    }, 200);
                }
                showToast('Tema gelap diaktifkan 🌙', 'success');
            } else {
                // Switch to light
                html.setAttribute('data-theme', 'light');
                localStorage.setItem(CONFIG.STORAGE_KEY_THEME, 'light');
                if (icon) {
                    icon.style.transform = 'rotate(180deg) scale(0)';
                    setTimeout(() => {
                        icon.classList.remove('fa-moon');
                        icon.classList.add('fa-sun');
                        icon.style.transform = 'rotate(0deg) scale(1)';
                    }, 200);
                }
                showToast('Tema terang diaktifkan ☀️', 'success');
            }
        });
    }

    // ============================================
    // Export CSV
    // ============================================
    function exportCSV() {
        if (transactionHistory.length === 0) {
            showToast('Tidak ada data untuk di-export', 'error');
            return;
        }

        const headers = ['No', 'Tanggal & Waktu', 'Item', 'Tipe', 'Jumlah', 'Kondisi', 'Keterangan'];
        const rows = transactionHistory.map((t, i) => [
            i + 1,
            formatDate(t.timestamp),
            t.item,
            t.type,
            t.jumlah,
            t.kondisi,
            t.keterangan
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `riwayat_stock_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('File CSV berhasil di-download!', 'success');
    }

    // ============================================
    // Delete Transactions
    // ============================================
    let pendingDeleteMode = null; // 'single' or 'all'
    let pendingDeleteId = null;

    function showDeleteConfirmation(mode, id) {
        pendingDeleteMode = mode;
        pendingDeleteId = id || null;

        const textEl = $('#deleteConfirmText');
        if (mode === 'all') {
            textEl.innerHTML = `Apakah Anda yakin ingin menghapus <strong>semua ${transactionHistory.length} riwayat</strong> transaksi?`;
        } else {
            const t = transactionHistory.find(tr => tr.id === id);
            if (t) {
                textEl.innerHTML = `Hapus transaksi <strong>${escapeHtml(t.item)}</strong> (${t.type}, ${t.jumlah} unit) pada <strong>${formatDate(t.timestamp)}</strong>?`;
            } else {
                textEl.textContent = 'Hapus transaksi ini?';
            }
        }

        const modal = new bootstrap.Modal($('#modalKonfirmasiHapus'));
        modal.show();

        // Re-bind confirm button (remove old listeners)
        const btnConfirm = $('#btnConfirmDelete');
        const newBtn = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);
        newBtn.id = 'btnConfirmDelete';

        newBtn.addEventListener('click', () => {
            if (pendingDeleteMode === 'all') {
                deleteAllHistory();
            } else if (pendingDeleteMode === 'single' && pendingDeleteId) {
                deleteTransaction(pendingDeleteId);
            }
            modal.hide();
        });
    }

    function deleteTransaction(id) {
        const index = transactionHistory.findIndex(t => t.id === id);
        if (index === -1) {
            showToast('Transaksi tidak ditemukan', 'error');
            return;
        }

        transactionHistory.splice(index, 1);
        saveToLocalStorage();
        updateDashboard();
        renderRecentTransactions();
        renderHistory();
        showToast('Transaksi berhasil dihapus', 'success');
    }

    function deleteAllHistory() {
        const count = transactionHistory.length;
        transactionHistory = [];
        saveToLocalStorage();
        updateDashboard();
        renderRecentTransactions();
        renderHistory();
        showToast(`${count} riwayat transaksi berhasil dihapus`, 'success');
    }

    // ============================================
    // Utility Functions
    // ============================================
    function formatDate(isoString) {
        const d = new Date(isoString);
        const pad = n => n.toString().padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function updateDateTime() {
        const el = $('#datetimeDisplay');
        if (!el) return;
        const now = new Date();
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
        const pad = n => n.toString().padStart(2, '0');
        el.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} • ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }

    function showToast(message, type) {
        const toastEl = $('#toastNotif');
        const toastMsg = $('#toastMessage');
        if (!toastEl || !toastMsg) return;

        toastMsg.textContent = message;
        toastEl.className = `toast align-items-center border-0 toast-${type}`;

        const icon = type === 'success' ? '✅' : '❌';
        toastMsg.textContent = `${icon} ${message}`;

        const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3000 });
        toast.show();
    }

    function showLoading(show) {
        const overlay = $('#loadingOverlay');
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
    }

    function updateSyncStatus(connected) {
        const el = $('#syncStatus');
        if (!el) return;
        if (connected) {
            el.innerHTML = '<i class="fas fa-circle text-success"></i><span>Terhubung ke Spreadsheet</span>';
        } else {
            el.innerHTML = '<i class="fas fa-circle text-warning"></i><span>Mode Offline (Lokal)</span>';
        }
    }

    // ============================================
    // Start
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
