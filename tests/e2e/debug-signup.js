// Debug script to test signup functionality
// Run this in the browser console on http://localhost:5173

async function testSignup() {
    console.log('🧪 Testing signup functionality...');
    
    try {
        // Test 1: Basic connectivity
        console.log('1. Testing basic connectivity...');
        const healthResponse = await fetch('http://localhost:3001/health');
        console.log('Health check:', healthResponse.status, await healthResponse.json());
        
        // Test 2: CORS preflight
        console.log('2. Testing CORS preflight...');
        const preflightResponse = await fetch('http://localhost:3001/api/auth/register', {
            method: 'OPTIONS',
            headers: {
                'Origin': window.location.origin,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });
        console.log('Preflight status:', preflightResponse.status);
        console.log('CORS headers:', {
            'Access-Control-Allow-Origin': preflightResponse.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': preflightResponse.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': preflightResponse.headers.get('Access-Control-Allow-Headers'),
            'Access-Control-Allow-Credentials': preflightResponse.headers.get('Access-Control-Allow-Credentials')
        });
        
        // Test 3: Actual signup request
        console.log('3. Testing actual signup request...');
        const signupData = {
            email: 'debugtest@example.com',
            username: 'debugtest',
            password: 'debugpassword123'
        };
        
        const signupResponse = await fetch('http://localhost:3001/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(signupData)
        });
        
        console.log('Signup status:', signupResponse.status);
        console.log('Signup headers:', [...signupResponse.headers.entries()]);
        
        if (signupResponse.ok) {
            const result = await signupResponse.json();
            console.log('✅ Signup successful:', result);
        } else {
            const error = await signupResponse.text();
            console.log('❌ Signup failed:', error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    }
}

// Run the test
testSignup();