
import mongoose from 'mongoose';
import Movie from '../models/Movie.js';

const MONGODB_URI = 'mongodb+srv://diwakarmishraemail_db_user:1wrt5zalVdwb2BJS@arthouse-atlas.uhbuitc.mongodb.net/arthouse_atlas?retryWrites=true&w=majority&appName=arthouse-atlas';

const missingFilms = [
  {
    title: "The Souvenir: Part II",
    year: 2021,
    directors: ["Joanna Hogg"],
    synopsis: "In the aftermath of her tumultuous relationship with a manipulative older man, film student Julie begins to untangle her fraught love for him in making her graduation film, sorting fact from his elaborately constructed fiction, while pushing against the constraints of the London independent film scene.",
    genres: ["Drama", "Romance"],
    keywords: ["film student", "memory", "grief", "london", "meta-cinema"],
    posterUrl: "https://image.tmdb.org/t/p/w500/vG9n60mR5fOqMvF8Y4W4s4sY1zX.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/rM6Y1h8v1y7Y5u5H6o2C4wRwP0f.jpg",
    tier: 1
  },
  {
    title: "Memoria",
    year: 2021,
    directors: ["Apichatpong Weerasethakul"],
    synopsis: "Jessica, a Scottish orchid farmer visiting her sister in Bogotá, is awakened one morning by a loud 'bang' that only she can hear. This haunting sound disrupts her sleep and prompts her on a journey to find its source, leading to unexpected encounters and revelations.",
    genres: ["Drama", "Mystery", "Science Fiction"],
    keywords: ["sound", "memory", "colombia", "meditation"],
    posterUrl: "https://image.tmdb.org/t/p/w500/vZ0e6yGj38H8z6RzWz7WfD0e8D.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/pA0Vv8Y1H6uXyS5N4u8z6RzWz7W.jpg",
    tier: 1
  },
  {
    title: "Flee",
    year: 2021,
    directors: ["Jonas Poher Rasmussen"],
    synopsis: "Amin Nawabi, a pseudonymous Afghan refugee, shares his hidden past of fleeing his home country to Denmark. This animated documentary explores themes of displacement, trauma, and identity.",
    genres: ["Animation", "Documentary", "Drama"],
    keywords: ["refugee", "afghanistan", "denmark", "trauma", "lgbtq+"],
    posterUrl: "https://image.tmdb.org/p/w500/6vA8K8z6RzWz7WfD0e8D.jpg",
    backdropUrl: "https://image.tmdb.org/p/original/6vA8K8z6RzWz7WfD0e8D.jpg",
    tier: 1
  },
  {
    title: "Wheel of Fortune and Fantasy",
    year: 2021,
    directors: ["Ryusuke Hamaguchi"],
    synopsis: "An anthology film comprising three independent tales exploring the complexities of relationships, love, longing, and desire through coincidences that happen in the lives of women.",
    genres: ["Drama", "Romance"],
    keywords: ["anthology", "coincidence", "fate", "conversation", "japan"],
    posterUrl: "https://image.tmdb.org/p/w500/6vA8K8z6RzWz7WfD0e8D.jpg",
    backdropUrl: "https://image.tmdb.org/p/original/6vA8K8z6RzWz7WfD0e8D.jpg",
    tier: 1
  },
  {
    title: "Great Freedom",
    year: 2021,
    directors: ["Sebastian Meise"],
    synopsis: "In post-war Germany, Hans Hoffmann is repeatedly imprisoned under Paragraph 175, a law criminalizing homosexuality. The film portrays his journey through several incarcerations and his evolving relationship with his cellmate Viktor.",
    genres: ["Drama", "Romance"],
    keywords: ["germany", "prison", "paragraph 175", "lgbtq+", "intimacy"],
    posterUrl: "https://image.tmdb.org/p/w500/6vA8K8z6RzWz7WfD0e8D.jpg",
    backdropUrl: "https://image.tmdb.org/p/original/6vA8K8z6RzWz7WfD0e8D.jpg",
    tier: 1
  },
  {
    title: "A Hero",
    year: 2021,
    directors: ["Asghar Farhadi"],
    synopsis: "Rahim is in prison due to an unpaid debt. During a two-day leave, he attempts to convince his creditor to withdraw the complaint in exchange for a partial payment, leading to a moral drama exploring themes of honor and truth.",
    genres: ["Drama", "Thriller"],
    keywords: ["iran", "debt", "morality", "prison", "honor"],
    posterUrl: "https://image.tmdb.org/p/w500/6vA8K8z6RzWz7WfD0e8D.jpg",
    backdropUrl: "https://image.tmdb.org/p/original/6vA8K8z6RzWz7WfD0e8D.jpg",
    tier: 1
  },
  {
    title: "The Lost Daughter",
    year: 2021,
    directors: ["Maggie Gyllenhaal"],
    synopsis: "While on a seaside vacation, middle-aged university professor Leda Caruso becomes consumed with a young mother and daughter she observes on the beach, triggering memories of her own early motherhood.",
    genres: ["Drama", "Mystery"],
    keywords: ["motherhood", "vacation", "memory", "obsession", "italy"],
    posterUrl: "https://image.tmdb.org/p/w500/6vA8K8z6RzWz7WfD0e8D.jpg",
    backdropUrl: "https://image.tmdb.org/p/original/6vA8K8z6RzWz7WfD0e8D.jpg",
    tier: 1
  },
  {
    title: "Past Lives",
    year: 2023,
    directors: ["Celine Song"],
    synopsis: "Nora and Hae Sung, two deeply connected childhood friends, are separated after Nora's family emigrates from South Korea. Twenty-four years later, they are reunited for one fateful week in New York, confronting notions of destiny and love.",
    genres: ["Drama", "Romance"],
    keywords: ["childhood friends", "destiny", "reunion", "new york", "soulmates"],
    posterUrl: "https://image.tmdb.org/p/w500/6vA8K8z6RzWz7WfD0e8D.jpg",
    backdropUrl: "https://image.tmdb.org/p/original/6vA8K8z6RzWz7WfD0e8D.jpg",
    tier: 1
  },
  {
    title: "I Saw the TV Glow",
    year: 2024,
    directors: ["Jane Schoenbrun"],
    synopsis: "Teenager Owen struggles with suburban life until a classmate introduces him to a mysterious late-night supernatural TV show. As they bond over the series, their reality begins to blur.",
    genres: ["Drama", "Horror", "Mystery"],
    keywords: ["television", "identity", "suburbia", "reality", "metaphysical"],
    posterUrl: "https://image.tmdb.org/p/w500/6vA8K8z6RzWz7WfD0e8D.jpg",
    backdropUrl: "https://image.tmdb.org/p/original/6vA8K8z6RzWz7WfD0e8D.jpg",
    tier: 1
  }
];

const seedMissing = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to Atlas');

    const moviesToInsert = missingFilms.map(m => ({
      ...m,
      decade: Math.floor(m.year / 10) * 10,
      derivedTags: [...m.genres, ...m.keywords].map(t => t.toLowerCase())
    }));

    const result = await Movie.insertMany(moviesToInsert);
    console.log(`Successfully added ${result.length} missing films.`);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedMissing();
