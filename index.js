const express = require('express');
const fs = require('fs');
const axios = require('axios');
const PdfPrinter = require('pdfmake');

const app = express();
const port = 8000;
let attachmentCount =0
// Fetch the image then convert it to base64
async function getBase64ImageFromURL(url) {
    const startTime = Date.now();
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer'
        });
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        const mimeType = response.headers['content-type'];
        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        console.error('Error converting image to base64:', error);
        throw error;
    }
}

// Adding fonts
const printer = new PdfPrinter({
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
    }
});

// Getting the data from db.json
const rawData = fs.readFileSync('db.json');
const jsonData = JSON.parse(rawData);
const notes = jsonData.data;


async function createPdfDefinition2(notes) {
    const startTime = Date.now();
    const content = [];
    for (const note of notes) {
        content.push(
            { text: `Title: ${note.title}`, style: 'header' },
            { text: `Description: ${note.description}`, style: 'subheader' },
            { text: `Owner: ${note.owner}`, style: 'subheader' },
            { text: `Email: ${note.email}`, style: 'subheader' },
            { text: `Modified At: ${new Date(note.modifiedAt).toLocaleString()}`, style: 'subheader' }
        );

        // Add noteAttachments if they exist (Images part starts here)
        if (note.notesAttachments && note.notesAttachments.length > 0) {
            attachmentCount += note.notesAttachments.length
            const imgPromises = note.notesAttachments.map(a => getBase64ImageFromURL(a.getUrl));
            const imgs = await Promise.all(imgPromises);
            imgs.forEach((image, i) => content.push(
                { text: `Attachment: ${note.notesAttachments[i].title}`, style: 'subheader' },
                {
                    image,
                    width: 400,
                    margin: [0, 0, 0, 10]
                }
            ));
        }

        // Adding space between notes
        content.push({ text: '', margin: [0, 0, 0, 10] });
    }
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // Convert to seconds
    console.log(`Total time to create PDF: ${duration.toFixed(3)}s`);

    return {
        content,
        styles: {
            header: {
                fontSize: 18,
                bold: true,
                margin: [0, 0, 0, 10]
            },
            subheader: {
                fontSize: 14,
                margin: [0, 10, 0, 5]
            }
        }
    };
}

// Route for download pdf
app.get('/', async (req, res) => {
    const startTime = Date.now();
    try {
        const docDefinition = await createPdfDefinition2(notes);
        const pdfDoc = printer.createPdfKitDocument(docDefinition);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="notes.pdf"');

        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (error) {
        console.error('Error in /download route:', error);
        res.status(500).send('Error generating PDF');
    }
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`Total response time for / route: ${duration.toFixed(3)}s`);
    console.log(`Total Attachments : ${attachmentCount}`)
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    
});
