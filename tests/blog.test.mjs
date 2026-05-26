import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = new URL('..', import.meta.url).pathname;

function read(path) {
	return readFileSync(join(root, path), 'utf8');
}

test('blog content config defines required collection fields', () => {
	const config = read('src/content/config.ts');

	assert.match(config, /defineCollection/);
	assert.match(config, /title:\s*z\.string\(\)/);
	assert.match(config, /description:\s*z\.string\(\)/);
	assert.match(config, /pubDate:\s*z\.coerce\.date\(\)/);
	assert.match(config, /draft:\s*z\.boolean\(\)/);
	assert.match(config, /collections\s*=\s*\{\s*blog\s*\}/);
});

test('sample blog posts exist under src/content/blog', () => {
	assert.ok(existsSync(join(root, 'src/content/blog/welcome.md')));
	assert.ok(existsSync(join(root, 'src/content/blog/getting-started.md')));
});

test('blog helpers derive URL slugs without file extensions', async () => {
	const { getPostSlug } = await import('../src/lib/blog.ts');

	assert.equal(getPostSlug({ id: 'welcome.md' }), 'welcome');
	assert.equal(getPostSlug({ id: 'notes/post.mdx' }), 'notes/post');
});

test('blog helpers sort published posts newest first', async () => {
	const { isPublishedPost, sortPostsByDateNewestFirst } = await import('../src/lib/blog.ts');

	const posts = [
		{
			id: 'older',
			data: { title: 'Older', description: '', pubDate: new Date('2026-05-01'), draft: false },
		},
		{
			id: 'newer',
			data: { title: 'Newer', description: '', pubDate: new Date('2026-05-26'), draft: false },
		},
		{
			id: 'draft',
			data: { title: 'Draft', description: '', pubDate: new Date('2026-05-27'), draft: true },
		},
	];

	assert.equal(isPublishedPost(posts[2]), false);

	const sorted = sortPostsByDateNewestFirst(posts.filter(isPublishedPost));
	assert.deepEqual(
		sorted.map((post) => post.id),
		['newer', 'older'],
	);
});

test('astro build generates blog routes', () => {
	execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'pipe' });

	const blogIndex = read('dist/blog/index.html');
	assert.match(blogIndex, /Getting started with content collections/);
	assert.match(blogIndex, /Welcome to the blog/);
	assert.doesNotMatch(blogIndex, /Draft post \(hidden\)/);

	const postPage = read('dist/blog/getting-started/index.html');
	assert.match(postPage, /<h1>Getting started with content collections<\/h1>/);
	assert.match(postPage, /Posts live in <code>src\/content\/blog\/<\/code>/);

	const homePage = read('dist/index.html');
	assert.match(homePage, /href="\/blog\/"/);
});
