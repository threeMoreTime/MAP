// The same PRD acceptance checks run against the deployed Pages base URL.
process.env.BASE_URL ||= 'https://threemoretime.github.io/MAP/';
require('./acceptance-workbench.cjs');
