import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePdfContent } from './pdf_generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Increase payload limit for large Markdown content
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
    res.send('PDF Generator service is running.');
});

app.post('/generate-single-para', async (req, res) => {
    const tempFilesDir = path.join(__dirname, 'temp_files');
    try {
        const data = req.body;

        if (!data || !data.content) {
            return res.status(400).json({
                success: false,
                error: 'Invalid data format. Missing "content" field.'
            });
        }

        await fs.mkdir(tempFilesDir, { recursive: true });
        data.tempFilesDir = tempFilesDir;

        const pdfFilePath = await generatePdfContent(data);

        await fs.access(pdfFilePath);

        const pdfFileName = path.basename(pdfFilePath);
        const downloadUrl = `/download/${pdfFileName}`;

        res.json({
            success: true,
            message: 'PDF generated successfully.',
            file_path: pdfFileName,
            download_url: downloadUrl
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred during PDF generation.',
            details: error.message
        });
    }
});

app.get('/download/:filename', async (req, res) => {
    const fileName = req.params.filename;
    const tempFilesDir = path.join(__dirname, 'temp_files');
    const filePath = path.join(tempFilesDir, fileName);

    // Prevent directory traversal
    if (!filePath.startsWith(tempFilesDir)) {
        return res.status(403).send('Forbidden.');
    }

    try {
        await fs.access(filePath);
        res.download(filePath, fileName, async (err) => {
            // Delete file after download (whether error or success)
            try {
                await fs.unlink(filePath);
            } catch (cleanupErr) {
                // Ignore cleanup errors
            }
        });
    } catch (error) {
        res.status(404).send('File not found.');
    }
});

app.listen(port, () => {
    console.log(`PDF generator server listening on port ${port}`);
});