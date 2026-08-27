// Maps a thrown error to a safe HTTP status + message.
// Invalid Mongo ObjectIds (Mongoose CastError) become a 400 instead of a leaked 500.
export const getErrorResponse = (error) => {
  if (error?.name === 'CastError') {
    return { status: 400, message: 'Invalid ID format' };
  }
  return { status: 500, message: 'Something went wrong' };
};
