const ImageKit = require("imagekit");

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL,
});

async function uploadImg(file, filename) {
  console.log("Uploading file to ImageKit:", { fileName: filename });

  const response = await imagekit.upload({
    file: file,
    fileName: filename,
    folder: "SIH",
  });

  console.log("File uploaded to ImageKit successfully:", {
    url: response.url,
    fileId: response.fileId,
  });

  return response;
}

module.exports = uploadImg;
