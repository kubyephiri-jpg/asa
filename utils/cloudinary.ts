export async function uploadImageToCloudinary(
  base64Image: string,
  folder: string = 'driver_images'
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', `data:image/jpeg;base64,${base64Image}`);
    formData.append('upload_preset', 'Aletwende_Driver');
    formData.append('folder', folder);

    const response = await fetch('https://api.cloudinary.com/v1_1/dexo5rpxb/image/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
}

export async function uploadCyclistImageToCloudinary(
  base64Image: string
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', `data:image/jpeg;base64,${base64Image}`);
    formData.append('upload_preset', 'cyclist-images');
    formData.append('folder', 'cyclist_images');

    const response = await fetch('https://api.cloudinary.com/v1_1/dexo5rpxb/image/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading cyclist image to Cloudinary:', error);
    throw error;
  }
}
