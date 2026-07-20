import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ROOT = process.cwd();

describe('fs-utils', () => {
  let tempDir;
  let fsUtils;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svg-packer-test-'));
    fsUtils = await import('../src/utils/fs-utils.js');
  });

  afterEach(() => {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('getFileSizeInBytes returns 0 for missing file', () => {
    expect(fsUtils.getFileSizeInBytes('/nonexistent/file.svg')).toBe(0);
  });

  it('getFileSizeInBytes returns correct size', () => {
    const filePath = path.join(tempDir, 'test.svg');
    fs.writeFileSync(filePath, '<svg></svg>');
    expect(fsUtils.getFileSizeInBytes(filePath)).toBe(11);
  });

  it('ensureDirectoryExists creates missing directories', () => {
    const testDir = path.join(tempDir, 'a', 'b', 'c');
    expect(fs.existsSync(testDir)).toBe(false);
    fsUtils.ensureDirectoryExists(testDir);
    expect(fs.existsSync(testDir)).toBe(true);
  });

  it('ensureDirectoryExists does not throw if exists', () => {
    fsUtils.ensureDirectoryExists(tempDir);
    expect(fs.existsSync(tempDir)).toBe(true);
  });

  it('toRelativePath converts absolute to relative from project root', () => {
    const rel = fsUtils.toRelativePath(path.join(ROOT, 'src', 'index.js'));
    expect(rel).toBe(path.join('src', 'index.js'));
  });

  it('toRelativePath handles paths already inside project', () => {
    const rel = fsUtils.toRelativePath(path.join(ROOT, 'icon', 'test'));
    expect(rel).toBe(path.join('icon', 'test'));
  });

  it('getConfig returns object with expected keys', () => {
    const config = fsUtils.getConfig();
    expect(config).toHaveProperty('last_used');
    expect(config).toHaveProperty('output_history');
    expect(Array.isArray(config.output_history)).toBe(true);
  });

  it('saveConfig and getConfig round-trip', () => {
    const testConfig = { last_used: 'foo', output_history: ['bar', 'baz'] };
    fsUtils.saveConfig(testConfig);
    const loaded = fsUtils.getConfig();
    expect(loaded).toEqual(testConfig);
  });

  it('readSVGFile reads file contents', () => {
    const filePath = path.join(tempDir, 'test.svg');
    fs.writeFileSync(filePath, '<svg></svg>');
    expect(fsUtils.readSVGFile(filePath)).toBe('<svg></svg>');
  });
});
