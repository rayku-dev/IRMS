import prisma from './src/utils/prisma.js';
import { supabase } from './src/utils/supabase.js';

async function testUrl() {
  const file = await prisma.file.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  
  if (!file) {
    console.log("No files found");
    return;
  }
  
  console.log("Latest file path:", file.path);
  const { data } = supabase.storage.from('irms-files').getPublicUrl(file.path);
  console.log("Public URL:", data.publicUrl);
  
  const response = await fetch(data.publicUrl, { method: 'HEAD' });
  console.log("HTTP Status:", response.status);
  if (!response.ok) {
    const text = await response.text();
    console.log("Error body:", text);
  }
}

testUrl().catch(console.error);
