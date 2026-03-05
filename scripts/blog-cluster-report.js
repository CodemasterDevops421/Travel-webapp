/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const { loadBlogPosts, buildClusterReport } = require('./lib/blog-content-utils');

const OUTPUT_PATH = path.join(process.cwd(), '.planning', 'artifacts', 'phase-11', 'cluster-report.json');

function run() {
  const posts = loadBlogPosts();
  const report = buildClusterReport(posts);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`CLUSTER_REPORT_PATH=${OUTPUT_PATH}`);
  console.log(`CLUSTER_COUNT=${report.clusterCount}`);
}

run();
