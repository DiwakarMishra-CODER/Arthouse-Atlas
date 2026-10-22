import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankVideos, decide, youTubeId } from '../scripts/media/trailers.js';
import { creditsOf } from '../scripts/media/credits.js';

test('a trailer before a teaser before a clip, official first; nothing but YouTube', () => {
  const videos = [
    { site: 'YouTube', type: 'Clip', key: 'clip0000000', official: true },
    { site: 'Vimeo', type: 'Trailer', key: 'vimeo000000' },
    { site: 'YouTube', type: 'Trailer', key: 'fanmade0000', official: false },
    { site: 'YouTube', type: 'Teaser', key: 'teaser00000', official: true },
    { site: 'YouTube', type: 'Trailer', key: 'official000', official: true },
    { site: 'YouTube', type: 'Featurette', key: 'feature0000', official: true },
  ];
  assert.deepEqual(rankVideos(videos), ['official000', 'fanmade0000', 'teaser00000', 'clip0000000']);
});

test('keep a trailer that plays; replace one that does not; keep one that plays only on YouTube; else clear', () => {
  assert.deepEqual(decide('aaaaaaaaaaa', { aaaaaaaaaaa: 200 }, []), { action: 'keep', key: 'aaaaaaaaaaa' });
  assert.deepEqual(decide('aaaaaaaaaaa', { aaaaaaaaaaa: 404, bbbbbbbbbbb: 200 }, ['bbbbbbbbbbb']), { action: 'replace', key: 'bbbbbbbbbbb' });
  assert.deepEqual(decide(null, { bbbbbbbbbbb: 200 }, ['bbbbbbbbbbb']), { action: 'replace', key: 'bbbbbbbbbbb' });
  assert.deepEqual(decide('aaaaaaaaaaa', { aaaaaaaaaaa: 401, bbbbbbbbbbb: 404 }, ['bbbbbbbbbbb']), { action: 'youtube-only', key: 'aaaaaaaaaaa' });
  assert.deepEqual(decide('aaaaaaaaaaa', { aaaaaaaaaaa: 403 }, []), { action: 'clear', key: null });
  assert.deepEqual(decide(null, {}, []), { action: 'none', key: null });
  assert.equal(youTubeId('https://www.youtube.com/embed/abcDEF12345?autoplay=1'), 'abcDEF12345');
  assert.equal(youTubeId('https://www.youtube.com/watch?v=abcDEF12345'), 'abcDEF12345');
});

test('credits: the first six billed (never archive footage), writers screenplay first, the language it is in first', () => {
  const c = creditsOf({
    tagline: '  A tagline. ',
    original_language: 'sv',
    spoken_languages: [{ english_name: 'English', iso_639_1: 'en' }, { english_name: 'Swedish', iso_639_1: 'sv' }],
    credits: {
      cast: [
        { name: 'B', character: 'Alma', order: 1 },
        { name: 'A', character: 'Elisabet (uncredited)', order: 0 },
        { name: 'Monk', character: 'Self (archive footage)', order: 2 },
      ],
      crew: [
        { job: 'Novel', name: 'Author Person' },
        { job: 'Screenplay', name: 'Writer Person' },
        { job: 'Editor', name: 'Cutter' },
        { job: 'Editor', name: 'Cutter' },
      ],
    },
  });
  assert.deepEqual(c.cast, [{ name: 'A', character: 'Elisabet' }, { name: 'B', character: 'Alma' }]);
  assert.deepEqual(c.writers, [{ name: 'Writer Person', job: 'Screenplay' }, { name: 'Author Person', job: 'Novel' }]);
  assert.deepEqual(c.editors, ['Cutter']);
  assert.equal(c.originalLanguage, 'Swedish');
  assert.deepEqual(c.languages, ['Swedish', 'English']);
  assert.equal(c.tagline, 'A tagline.');
  assert.equal(creditsOf(null).tagline, null);
});
