
import axios from 'axios';

async function testTitles() {
  try {
    const response = await axios.get('http://localhost:5000/api/movies/titles');
    console.log("Titles returned:", response.data.length);
    if (response.data.length > 0) {
      console.log("First item:", response.data[0]);
    }
  } catch (error) {
    console.error("Error fetching titles:", error.message);
  }
}

testTitles();
