// Script to clear localStorage and ensure clean state
// Run this in browser console on http://localhost:5173

console.log('🧹 Clearing localStorage to fix any corrupted config data...');

// List all localStorage keys before clearing
const keysBefore = [];
for (let i = 0; i < localStorage.length; i++) {
    keysBefore.push(localStorage.key(i));
}
console.log('LocalStorage keys before clearing:', keysBefore);

// Clear all ShimmyServe-related localStorage
const shimmy_keys = keysBefore.filter(key => 
    key && (key.includes('shimmy') || key.includes('Shimmy') || key.includes('config'))
);

shimmy_keys.forEach(key => {
    console.log(`Removing: ${key}`);
    localStorage.removeItem(key);
});

// Clear all localStorage if needed
// localStorage.clear();

console.log('✅ localStorage cleared. Please refresh the page.');
console.log('The application should now use default configurations.');

// Verify clearing
const keysAfter = [];
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('shimmy') || key.includes('Shimmy') || key.includes('config'))) {
        keysAfter.push(key);
    }
}
console.log('Remaining ShimmyServe keys:', keysAfter);