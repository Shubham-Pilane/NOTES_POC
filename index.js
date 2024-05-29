const express = require('express');
const fs = require('fs');
const axios = require('axios'); 
const PdfPrinter = require('pdfmake');


const app = express();
const port = 8000;

// const fonts = {
//     Roboto: {
//         normal: 'fonts/Roboto-Regular.ttf',
//         bold: 'fonts/Roboto-Medium.ttf',
//         italics: 'fonts/Roboto-Italic.ttf',
//         bolditalics: 'fonts/Roboto-MediumItalic.ttf'
//     }
// };
// fetch the image then convert it in base64
async function getBase64ImageFromURL(url) {
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
     
  }}
// adding fonts 
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

async function createPdfDefinition(notes) {
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
        // if (note.notesAttachments && note.notesAttachments.length > 0) {
        //     for (const attachment of note.notesAttachments) {
        //         if (attachment.getUrl) {
        //             try {
        //                 const base64Image = await imageToBase64(attachment.getUrl);
        //                 // console.log(base64Image)
        //                 content.push(
        //                     { text: `Attachment: ${attachment.title}`, style: 'subheader' },
        //                     {
        //                         image: await getBase64ImageFromURL(attachment.getUrl),
        //                         width: 400,
        //                         margin: [0, 0, 0, 10]
        //                     }
        //                 );
        //             } catch (error) {
        //                 console.error('Error converting image to base64:', error);
        //             }
        //         }
        //     }
        // }
             
        // Adding space between notes
        content.push({ text: '', margin: [0, 0, 0, 10] }); 
    }

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
app.get('/download', async (req, res) => {
    const docDefinition = await createPdfDefinition(notes);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="notes.pdf"');

    pdfDoc.pipe(res);
    pdfDoc.end();
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
