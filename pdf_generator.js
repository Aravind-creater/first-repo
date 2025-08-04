import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import marked from 'marked';
import path from 'path';

/**
 * Generates a PDF file from Markdown content.
 * @param {object} data - The data object containing content and configuration.
 * @param {string} data.content - The Markdown content to be converted to PDF.
 * @param {string} [data.tempFilesDir] - The directory to save the temporary PDF file.
 * @returns {Promise<string>} - A promise that resolves with the full path of the generated PDF file.
 */
export async function generatePdfContent(data) {
    const content = data.content;
    const tempFilesDir = data.tempFilesDir || path.join(process.cwd(), 'temp_files');

    await fs.mkdir(tempFilesDir, { recursive: true });

    let htmlContent;
    try {
        htmlContent = marked.parse(content);
    } catch (error) {
        throw new Error('Failed to convert Markdown content.');
    }

    const customCss = `
        body {
            font-family: Arial, sans-serif;
            margin: 2cm;
            line-height: 1.5;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #333;
        }
        pre {
            background-color: #f4f4f4;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        img {
            max-width: 100%;
            height: auto;
        }
    `;

    const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>${customCss}</style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `;

    let browser;
    let pdfFilePath;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

        const timestamp = Date.now();
        const pdfFileName = `document-${timestamp}.pdf`;
        pdfFilePath = path.join(tempFilesDir, pdfFileName);

        await page.pdf({
            path: pdfFilePath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '2cm',
                right: '2cm',
                bottom: '2cm',
                left: '2cm',
            }
        });

        return pdfFilePath;

    } catch (error) {
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}