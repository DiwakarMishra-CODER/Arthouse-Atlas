import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Movie from '../models/Movie.js';

dotenv.config();

const exportScores = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const movies = await Movie.find({})
      .select('title year directors baseCanonScore vote_average')
      .sort({ baseCanonScore: -1 });

    console.log(`📊 Total Movies: ${movies.length}\n`);
    
    // Create CSV content
    let csvContent = 'Rank,Title,Year,Director,Canon Score,TMDB Rating\n';
    
    console.log('═'.repeat(100));
    console.log('RANK | TITLE | YEAR | DIRECTOR | CANON SCORE | TMDB RATING');
    console.log('═'.repeat(100));
    
    movies.forEach((movie, index) => {
      const rank = index + 1;
      const title = movie.title || 'Unknown';
      const year = movie.year || 'N/A';
      const director = movie.directors?.[0] || 'Unknown';
      const score = movie.baseCanonScore || 0;
      const rating = movie.vote_average || 0;
      
      // Console output (show top 50 and bottom 10)
      if (rank <= 50 || rank > movies.length - 10) {
        console.log(
          `${rank.toString().padStart(3)} | ${title.padEnd(45).substring(0, 45)} | ${year} | ${director.padEnd(25).substring(0, 25)} | ${score.toString().padStart(3)} | ${rating.toFixed(1)}`
        );
        
        if (rank === 50 && movies.length > 60) {
          console.log('... (middle rankings omitted for brevity) ...');
        }
      }
      
      // Add to CSV (escape commas in titles)
      const escapedTitle = title.includes(',') ? `"${title}"` : title;
      const escapedDirector = director.includes(',') ? `"${director}"` : director;
      csvContent += `${rank},${escapedTitle},${year},${escapedDirector},${score},${rating}\n`;
    });
    
    console.log('═'.repeat(100));
    
    // Write CSV file
    const csvPath = './scripts/all-movie-scores.csv';
    fs.writeFileSync(csvPath, csvContent);
    console.log(`\n✅ Full scores exported to: ${csvPath}`);
    console.log('   You can open this file in Excel, Google Sheets, or any spreadsheet app!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

exportScores();
