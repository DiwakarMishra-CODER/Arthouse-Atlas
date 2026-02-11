import axios from 'axios';

const API_URL = 'http://localhost:5000/api/discover';

const testDiscoveryEndpoints = async () => {
  console.log('=== Testing Discovery API Endpoints ===\n');
  
  try {
    // Test 1: Get available moods
    console.log('1. Testing GET /api/discover/moods/list');
    const moodsRes = await axios.get(`${API_URL}/moods/list`);
    console.log(`✅ Found ${moodsRes.data.length} moods:`);
    console.log(`   ${moodsRes.data.join(', ')}\n`);
    
    // Test 2: Get explore films
    console.log('2. Testing GET /api/discover/explore');
    const exploreRes = await axios.get(`${API_URL}/explore?limit=10`);
    console.log(`✅ Returned ${exploreRes.data.movies.length} films`);
    console.log('   Top 5 films:');
    exploreRes.data.movies.slice(0, 5).forEach((film, idx) => {
      console.log(`   ${idx + 1}. ${film.title} (${film.year}) - BaseCanonScore: ${film.baseCanonScore}`);
    });
    console.log('');
    
    // Test 3: Get decade films
    console.log('3. Testing GET /api/discover/decade/1960');
    const decadeRes = await axios.get(`${API_URL}/decade/1960?limit=5`);
    console.log(`✅ Found ${decadeRes.data.total} films from 1960s, showing top 5:`);
    decadeRes.data.movies.forEach((film, idx) => {
      console.log(`   ${idx + 1}. ${film.title} (${film.year})`);
    });
    console.log('');
    
    // Test 4: Get mood films
    console.log('4. Testing GET /api/discover/mood?moods=contemplative,melancholic');
    const moodRes = await axios.get(`${API_URL}/mood?moods=contemplative,melancholic&limit=5`);
    console.log(`✅ Found ${moodRes.data.total} matching films, showing top 5:`);
    moodRes.data.movies.forEach((film, idx) => {
      console.log(`   ${idx + 1}. ${film.title} (${film.year})`);
    });
    console.log('');
    
    // Test 5: Get combined filter
    console.log('5. Testing GET /api/discover/combined?decade=2000&moods=intimate');
    const combinedRes = await axios.get(`${API_URL}/combined?decade=2000&moods=intimate&limit=5`);
    console.log(`✅ Found ${combinedRes.data.total} films from 2000s with 'intimate' mood:`);
    combinedRes.data.movies.forEach((film, idx) => {
      console.log(`   ${idx + 1}. ${film.title} (${film.year})`);
    });
    
    console.log('\n=== All Tests Passed! ===\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
};

testDiscoveryEndpoints();
