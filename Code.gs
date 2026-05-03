/**
 * CODE.GS - Google Apps Script (AUTO-ID VERSION)
 * Mendukung MULTI-SHEET: MASTER_PEGAWAI dan DATA_DOKUMEN.
 * Fitur: Auto-generate ID (PGW-xxxx, SIP-xxxx, SIK-xxxx, STR-xxxx).
 */

function doGet(e) {
  if (!e || !e.parameter) {
    return ContentService.createTextOutput("Apps Script Aktif. Akses melalui aplikasi.").setMimeType(ContentService.MimeType.TEXT);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = e.parameter.sheet || 'MASTER_PEGAWAI';
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Sheet '" + sheetName + "' tidak ditemukan." })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "data": [] })).setMimeType(ContentService.MimeType.JSON);
  }

  var headers = data[0];
  var rows = data.slice(1);
  
  var json = rows.filter(function(row) { return row[0] !== ""; }).map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) {
      var cellValue = row[i];
      if (cellValue instanceof Date) {
        obj[header] = Utilities.formatDate(cellValue, "GMT+7", "yyyy-MM-dd");
      } else {
        obj[header] = cellValue;
      }
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify({ "status": "success", "data": json })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error("Data tidak terbaca.");
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);

    // HELPER: Handle Inline File Upload
    // Jika payload mengandung fileData, kita upload dulu dan ganti field target dengan URL
    if (payload.fileData && payload.fileFieldName) {
      try {
        var folderId = payload.folderId || "1Xh0Axf9zl6Qq5umw_AzWyHHfy0xxfVku";
        var folder = DriveApp.getFolderById(folderId);
        var contentType = payload.mimeType || "image/jpeg";
        var bytes = Utilities.base64Decode(payload.fileData);
        var blob = Utilities.newBlob(bytes, contentType, payload.fileName || "upload");
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        // Simpan URL hasil upload ke dalam payload agar nantinya tersimpan ke Sheet
        payload[payload.fileFieldName] = "https://drive.google.com/uc?export=view&id=" + file.getId();
      } catch (fErr) {
        console.error("File Upload Failed: " + fErr.toString());
        // Lanjutkan tanpa mematikan proses, atau throw jika wajib ada file
      }
    }

    // ACTION: UPLOAD_IMAGE (Legacy support if needed)
    if (payload.action === 'uploadImage') {
      try {
        var folderId = payload.folderId || "1Xh0Axf9zl6Qq5umw_AzWyHHfy0xxfVku";
        var folder = DriveApp.getFolderById(folderId);
        var contentType = payload.mimeType || "image/jpeg";
        var bytes = Utilities.base64Decode(payload.fileData);
        var blob = Utilities.newBlob(bytes, contentType, payload.fileName || "photo.jpg");
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        return ContentService.createTextOutput(JSON.stringify({ 
          "status": "success", 
          "url": "https://drive.google.com/uc?export=view&id=" + file.getId()
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (fErr) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Drive Error: " + fErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    var sheetName = payload.sheetName || 'MASTER_PEGAWAI';
    var action = payload.action || 'create';
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    
    var headers = [];
    var idField = "";
    var idPrefix = "";
    
    if (sheetName === 'MASTER_PEGAWAI') {
      headers = ["id_pegawai", "NIK", "NIP", "Nama", "Status_Pegawai", "Tempat_Lahir", "Tanggal_Lahir", "Jenis_Kelamin", "Agama", "Status_Keluarga", "No_KK", "Nama_Suami_Istri", "Jumlah_Anak", "Alamat", "Kabupaten_Kota", "Provinsi", "Jenjang_Pendidikan", "Fakultas", "Jurusan", "Asal_Pendidikan", "Tanggal_Lulus", "Lampiran_Ijazah", "Lampiran_Transkrip", "Kelompok_Jabatan", "Jabatan", "Gol", "No_SK_Pangkat", "TMT_Pangkat", "Lampiran_SK_Kenaikan_Pangkat", "TMT_Berikutnya", "Status", "TMT_CPNS", "No_SK_CPNS", "Lampiran_SK_CPNS", "No_SK_PNS", "Lampiran_SK_PNS", "TMT_Nota_Tugas", "Lampiran_Nota_Tugas", "No_SK_Aktif_Tugas", "Lampiran_Aktif_Tugas", "Masuk_RS", "Masa_Kerja_RS", "Rentang_BUP", "TMT_Pensiun", "No_BPJS", "Lampiran_BPJS", "No_BPJSKET_TASPEN", "Lampiran_Ketenagakerjaan", "NPWP", "Lampiran_NPWP", "Email", "No_Telp", "Image", "Lampiran_KTP", "Keterangan", "timestamp"];
      idField = "id_pegawai";
      idPrefix = "PGW-";
    } else {
      headers = ["id_dokumen", "id_pegawai", "NIK", "Nama", "Jenis_Pegawai", "Jenis", "Jenis_Dokumen", "Nomor_Dokumen", "Tanggal_Terbit", "Tanggal_Expired", "Sisa_Hari", "Masa_Aktif", "Is_Aktif", "Versi_Dokumen", "Status_Dokumen", "Upload_Dokumen", "timestamp"];
      idField = "id_dokumen";
      idPrefix = (payload.Jenis_Dokumen || "DOC") + "-";
    }

    // Update/Ensure Headers in Sheet match Code.gs
    if (sheet.getLastRow() > 0) {
      var maxCols = sheet.getMaxColumns();
      if (maxCols < headers.length) {
        sheet.insertColumnsAfter(maxCols, headers.length - maxCols);
      }
      var currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
      if (JSON.stringify(currentHeaders) !== JSON.stringify(headers)) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
    
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    var sheetData = sheet.getDataRange().getValues();
    var idColumnIndex = headers.indexOf(idField);
    
    // Generate Auto ID for CREATE if not provided
    if (action === 'create' && (!payload[idField] || payload[idField] === "")) {
      var nextId = 1;
      if (sheetData.length > 1) {
        var existingIds = sheetData.slice(1).map(function(r) { 
          var val = r[idColumnIndex].toString();
          if (val.indexOf(idPrefix) === 0) {
            return parseInt(val.replace(idPrefix, ""), 10);
          }
          return 0;
        }).filter(function(n) { return !isNaN(n); });
        
        if (existingIds.length > 0) {
          nextId = Math.max.apply(null, existingIds) + 1;
        }
      }
      payload[idField] = idPrefix + ("0000" + nextId).slice(-4);
    }
    
    if (action === 'update' || action === 'delete') {
      var targetId = payload[idField];
      var rowIndex = -1;
      for (var i = 1; i < sheetData.length; i++) {
        if (sheetData[i][idColumnIndex] == targetId) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex === -1) throw new Error("ID " + targetId + " tidak ditemukan.");
      
      if (action === 'delete') {
        sheet.deleteRow(rowIndex);
        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Berhasil dihapus" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      if (action === 'update') {
        var updatedRow = headers.map(function(header) {
          if (header === 'timestamp') return new Date();
          var colIdx = headers.indexOf(header);
          var existingVal = (sheetData[rowIndex-1] && colIdx < sheetData[rowIndex-1].length) ? sheetData[rowIndex-1][colIdx] : "";
          return payload[header] !== undefined ? payload[header] : existingVal;
        });
        sheet.getRange(rowIndex, 1, 1, headers.length).setValues([updatedRow]);
        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Berhasil diperbarui" })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Default: CREATE
    var newRow = headers.map(function(header) {
      if (header === 'timestamp') return new Date();
      return payload[header] !== undefined ? payload[header] : "";
    });
    sheet.appendRow(newRow);
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Berhasil ditambahkan", "id": payload[idField] })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
