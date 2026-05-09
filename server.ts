/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Proxy for Google Apps Script to bypass CORS
  app.get("/api/gsheet-proxy", async (req, res) => {
    const originalUrl = req.query.url as string;
    if (!originalUrl) {
      return res.status(400).json({ success: false, message: "Missing script URL" });
    }

    try {
      const urlObj = new URL(originalUrl);
      Object.keys(req.query).forEach(key => {
        if (key !== 'url') {
          urlObj.searchParams.set(key, req.query[key] as string);
        }
      });
      const scriptUrl = urlObj.toString();
      
      console.log("Proxy fetching from GAS:", scriptUrl);
      const response = await fetch(scriptUrl, {
        redirect: 'follow'
      });
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();
      
      console.log("GAS Response Content-Type:", contentType);
      console.log("GAS Response Status:", response.status);
      if (contentType.includes("application/json") || contentType.includes("text/javascript") || (text.trim().startsWith("{") && text.trim().endsWith("}"))) {
        try {
          const data = JSON.parse(text);
          res.json({ success: true, ...data });
        } catch (e) {
          res.status(500).json({ 
            success: false, 
            message: "Gagal memproses JSON dari Google Apps Script.",
            debug: text.substring(0, 100)
          });
        }
      } else {
        // Deteksi jika ini adalah halaman login atau error HTML
        if (text.includes("<html") || text.includes("<!doctype")) {
          if (text.includes("Service Login") || text.includes("Google Accounts") || text.includes("Sign in")) {
            res.status(500).json({ 
              success: false, 
              message: "AKSES DITOLAK: Pastikan akses Web App di-set ke 'Anyone' (Siapa Saja) saat Deploy.",
              isAuthError: true
            });
          } else {
            res.status(500).json({ 
              success: false, 
              message: "Google mengembalikan halaman HTML (Bukan JSON). Ini biasanya tanda script error atau belum di-Deploy ulang sebagai 'Anyone'.",
              debug: text.substring(0, 300)
            });
          }
        } else {
          res.status(500).json({ 
            success: false, 
            message: "Format data salah (Bukan JSON).",
            debug: text.substring(0, 100)
          });
        }
      }
    } catch (error) {
      console.error("Proxy GET error:", error);
      res.status(500).json({ success: false, message: "Gagal menghubungi Google Apps Script." });
    }
  });

  app.post("/api/gsheet-proxy", async (req, res) => {
    const scriptUrl = req.query.url as string;
    if (!scriptUrl) {
      return res.status(400).json({ success: false, message: "Missing script URL" });
    }

    try {
      console.log("Proxy POSTing to GAS:", scriptUrl);
      const response = await fetch(scriptUrl, {
        method: "POST",
        body: JSON.stringify(req.body),
        headers: { "Content-Type": "application/json" }
      });
      
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();
      
      if (contentType.includes("application/json") || (text.trim().startsWith("{") && text.trim().endsWith("}"))) {
        try {
          const data = JSON.parse(text);
          res.json({ success: true, ...data });
        } catch (e) {
          res.status(500).json({ 
            success: false, 
            message: "Gagal memproses JSON dari Google Apps Script.",
            debug: text.substring(0, 100)
          });
        }
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Format data salah (Bukan JSON).",
          debug: text.substring(0, 100)
        });
      }
    } catch (error) {
      console.error("Proxy POST error:", error);
      res.status(500).json({ success: false, message: "Failed to post to Google Apps Script." });
    }
  });

  // API Routes (Mock)
  app.get("/api/pegawai", (req, res) => {
    const mockData = [
      {
        id_pegawai: "RSUD-2024-001",
        NIK: "1234567890123456",
        Nama: "Budi Santoso, S.Kom",
        Status_Pegawai: "PNS",
        Jabatan: "Pranata Komputer",
        Gol: "III/a",
        Email: "budi@rsud.go.id"
      },
      {
        id_pegawai: "RSUD-2024-002",
        NIK: "1234567890123457",
        Nama: "Siti Aminah, S.Kep, Ners",
        Status_Pegawai: "PPPK",
        Jabatan: "Perawat Mahir",
        Gol: "IX",
        Email: "siti@rsud.go.id"
      },
      {
        id_pegawai: "RSUD-2024-003",
        NIK: "1234567890123458",
        Nama: "Andi Wijaya, dr. Sp.PD",
        Status_Pegawai: "PNS",
        Jabatan: "Dokter Ahli Madya",
        Gol: "IV/a",
        Email: "andi@rsud.go.id"
      },
      {
        id_pegawai: "RSUD-2024-004",
        NIK: "1234567890123459",
        Nama: "Rina Marlina, S.Tr.Keb",
        Status_Pegawai: "Kontrak",
        Jabatan: "Bidan",
        Gol: "-",
        Email: "rina@rsud.go.id"
      }
    ];
    res.json({ success: true, data: mockData });
  });

  app.post("/api/pegawai", (req, res) => {
    const data = req.body;
    console.log("Received Pegawai Data:", data);

    res.json({
      success: true,
      message: "Data pegawai berhasil diterima (Mock Backend)",
      data: data
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
