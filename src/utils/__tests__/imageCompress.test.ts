const mockResize = jest.fn().mockReturnThis();
const mockSaveAsync = jest.fn().mockResolvedValue({
  uri: 'file:///cache/compressed.jpg',
  width: 1440,
  height: 1080,
});
const mockRenderAsync = jest.fn().mockResolvedValue({
  saveAsync: mockSaveAsync,
});
const mockManipulate = jest.fn().mockReturnValue({
  resize: mockResize,
  renderAsync: mockRenderAsync,
});

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
  ImageManipulator: {
    manipulate: (uri: string) => mockManipulate(uri),
  },
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    size: uri.includes('oversized') ? 25 * 1024 * 1024 : 250 * 1024,
    bytes: jest.fn().mockResolvedValue(new Uint8Array(100)),
  })),
}));

import {
  compressImage,
  isImageFile,
  validateFileSize,
  IMAGE_PRESETS,
  LIMITS,
} from '../imageCompress';

describe('imageCompress utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isImageFile', () => {
    it('identifies image extensions correctly', () => {
      expect(isImageFile('photo.jpg')).toBe(true);
      expect(isImageFile('photo.jpeg')).toBe(true);
      expect(isImageFile('screenshot.png')).toBe(true);
      expect(isImageFile('banner.webp')).toBe(true);
      expect(isImageFile('iphone.HEIC')).toBe(true);
    });

    it('identifies image MIME types correctly', () => {
      expect(isImageFile('file.bin', 'image/jpeg')).toBe(true);
      expect(isImageFile('file.bin', 'image/png')).toBe(true);
    });

    it('rejects documents and non-image files', () => {
      expect(isImageFile('routine.pdf')).toBe(false);
      expect(isImageFile('notes.docx')).toBe(false);
      expect(isImageFile('archive.zip')).toBe(false);
      expect(isImageFile('doc.bin', 'application/pdf')).toBe(false);
    });
  });

  describe('IMAGE_PRESETS and limits', () => {
    it('defines distinct presets for different use cases', () => {
      expect(IMAGE_PRESETS.avatar.maxDim).toBe(512);
      expect(IMAGE_PRESETS.standard.maxDim).toBe(1440);
      expect(IMAGE_PRESETS.document.maxDim).toBe(1800);
      expect(IMAGE_PRESETS.compact.maxDim).toBe(1024);
    });

    it('exports proper max byte limits', () => {
      expect(LIMITS.maxImageBytes).toBeGreaterThan(0);
      expect(LIMITS.maxDocumentBytes).toBeGreaterThan(0);
      expect(LIMITS.maxDocumentBytes).toBeGreaterThanOrEqual(LIMITS.maxImageBytes);
    });
  });

  describe('compressImage', () => {
    it('bypasses remote http/https URLs', async () => {
      const res = await compressImage('https://supabase.co/storage/v1/pic.jpg');
      expect(res.uri).toBe('https://supabase.co/storage/v1/pic.jpg');
      expect(mockManipulate).not.toHaveBeenCalled();
    });

    it('compresses local image with standard preset by default', async () => {
      const res = await compressImage('file:///photos/camera_snap.jpg', {
        knownWidth: 4000,
        knownHeight: 3000,
      });

      expect(mockManipulate).toHaveBeenCalledWith('file:///photos/camera_snap.jpg');
      expect(mockResize).toHaveBeenCalledWith({ width: 1440 });
      expect(mockSaveAsync).toHaveBeenCalledWith({
        format: 'jpeg',
        compress: IMAGE_PRESETS.standard.quality,
      });
      expect(res.uri).toBe('file:///cache/compressed.jpg');
    });

    it('uses avatar preset when requested', async () => {
      await compressImage('file:///avatar.jpg', {
        preset: 'avatar',
        knownWidth: 2000,
        knownHeight: 2000,
      });

      expect(mockResize).toHaveBeenCalledWith({ width: 512 });
      expect(mockSaveAsync).toHaveBeenCalledWith({
        format: 'jpeg',
        compress: IMAGE_PRESETS.avatar.quality,
      });
    });

    it('handles portrait orientation correctly', async () => {
      await compressImage('file:///portrait.jpg', {
        preset: 'standard',
        knownWidth: 3000,
        knownHeight: 4000,
      });

      // Long edge is height (4000). Target width = 3000 * (1440 / 4000) = 1080
      expect(mockResize).toHaveBeenCalledWith({ width: 1080 });
    });

    it('does not resize images that are already smaller than maxDim', async () => {
      await compressImage('file:///small_icon.jpg', {
        preset: 'standard',
        knownWidth: 400,
        knownHeight: 300,
      });

      // Long edge is 400 <= 1440, so resize should NOT be scheduled
      expect(mockResize).not.toHaveBeenCalled();
      expect(mockSaveAsync).toHaveBeenCalled();
    });

    it('falls back gracefully to original URI if manipulation fails', async () => {
      mockRenderAsync.mockRejectedValueOnce(new Error('Corrupt image data'));

      const res = await compressImage('file:///corrupt.jpg', {
        knownWidth: 1000,
        knownHeight: 800,
      });

      expect(res.uri).toBe('file:///corrupt.jpg');
      expect(res.width).toBe(1000);
    });
  });

  describe('validateFileSize', () => {
    it('returns ok for normal sized files', async () => {
      const res = await validateFileSize('file:///normal.pdf', 10 * 1024 * 1024);
      expect(res.ok).toBe(true);
    });

    it('returns not ok for oversized files', async () => {
      const res = await validateFileSize('file:///oversized.pdf', 10 * 1024 * 1024);
      expect(res.ok).toBe(false);
      expect(res.sizeBytes).toBeGreaterThan(10 * 1024 * 1024);
    });
  });
});
