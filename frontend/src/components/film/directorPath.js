// Where a director's name leads from a film: their page where they have one, otherwise their films in
// the atlas (Explore, narrowed to them). The film's API gives every director's page (directorIds).
export const directorPath = (movie, name) => {
    const id = movie.directorIds?.[name] || (name === movie.directors?.[0] && movie.directorId);
    return id ? `/directors/${id}` : `/explore?director=${encodeURIComponent(name)}`;
};
