// Simple test to manually trigger the daily inventory sync
const testInventorySync = async () => {
  const supabaseUrl = 'https://wgrephgnrldsyipbvjco.supabase.co'
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo'
  
  try {
    console.log('🚀 Testing daily inventory sync function...')
    
    const response = await fetch(`${supabaseUrl}/functions/v1/daily-inventory-sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: true })
    })
    
    const result = await response.json()
    console.log('📊 Response:', result)
    
    if (response.ok) {
      console.log('✅ Function executed successfully!')
    } else {
      console.log('❌ Function failed:', result)
    }
    
  } catch (error) {
    console.error('❌ Error calling function:', error)
  }
}

// Run the test
console.log('=== TESTING INVENTORY SYNC WITH UPSERT FIX ===')
testInventorySync().then(() => {
  console.log('=== TEST COMPLETED ===')
})