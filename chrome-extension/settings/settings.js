document.addEventListener('DOMContentLoaded', async () => {
  const settingsForm = document.getElementById('settingsForm');
  const secondBrainServerUrlInput = document.getElementById('secondBrainServerUrl');
  const saveButton = document.querySelector('button[type="submit"]');
  const statusMessage = document.createElement('div');
  
  // Setup status message element
  statusMessage.className = 'status-message';
  settingsForm.appendChild(statusMessage);
  
  // Encryption helpers
  const encryptionKey = 'capture-me-extension-key';
  
  // Function to encrypt sensitive data
  async function encryptData(data) {
    // If data is empty, return empty string
    if (!data) return '';
    
    console.log('Encrypting data, length:', data.length);
    
    try {
      // Create a random initialization vector
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Convert the encryption key to a CryptoKey
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(encryptionKey),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: new TextEncoder().encode("capture-me-salt"),
          iterations: 100000,
          hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
      );
      
      // Encrypt the data
      const encoded = new TextEncoder().encode(data);
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        encoded
      );
      
      // Combine IV and ciphertext
      const result = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
      result.set(iv, 0);
      result.set(new Uint8Array(ciphertext), iv.length);
      
      // Convert to base64
      const base64 = btoa(String.fromCharCode.apply(null, result));
      console.log('Using encryption, result length:', base64.length);
      
      return base64;
    } catch (error) {
      console.error('Error encrypting data:', error);
      // Fallback to simple base64 encoding
      console.log('Falling back to base64 encoding');
      return btoa(data);
    }
  }
  
  // Function to decrypt sensitive data
  async function decryptData(encryptedData) {
    if (!encryptedData) return '';
    
    try {
      // Convert base64 to array buffer
      const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      
      // Extract the IV and ciphertext
      const iv = encryptedBytes.slice(0, 12);
      const ciphertext = encryptedBytes.slice(12);
      
      // Import the encryption key
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(encryptionKey),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: new TextEncoder().encode("capture-me-salt"),
          iterations: 100000,
          hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        ciphertext
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      try {
        // Try simple base64 decode as fallback
        return atob(encryptedData);
      } catch (e) {
        console.error('Base64 decode error:', e);
        return '';
      }
    }
  }
  
  // Load saved settings
  async function loadSettings() {
    chrome.storage.sync.get([
      'secondBrainServerUrl'
    ], async (result) => {
      const secondBrainServerUrl = result.secondBrainServerUrl || 'http://localhost:8000';
      
      // Set the form values
      secondBrainServerUrlInput.value = secondBrainServerUrl;
    });
  }
  
  // Load settings on page load
  loadSettings();
  
  // Save settings
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveButton.disabled = true;
    
    // Get values from form
    const secondBrainServerUrl = secondBrainServerUrlInput.value.trim();
    
    // Always use encryption (hardcoded to true since we removed the checkbox)
    const encryptionEnabled = true;
    
    // Save to storage
    chrome.storage.sync.set({
      encryptionEnabled,
      secondBrainServerUrl
    }, () => {
      // Show success message
      statusMessage.textContent = 'Settings saved successfully!';
      statusMessage.className = 'status-message success';
      saveButton.disabled = false;
      
      // Remove message after 3 seconds
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 3000);
    });
  });
});