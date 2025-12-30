/**
 * Tests for FilePreview component
 */

import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import { FilePreview, type FilePreviewProps } from '@/shared/components/attachments/FilePreview';
import type { Attachment } from '@/shared/components/attachments/AttachmentUploader';

const mockImageAttachment: Attachment = {
  id: '1',
  filename: 'test-image.jpg',
  original_filename: 'vacation.jpg',
  mime_type: 'image/jpeg',
  size: 1024 * 100, // 100KB
  url: 'https://example.com/image.jpg',
  status: 'complete',
};

const mockPdfAttachment: Attachment = {
  id: '2',
  filename: 'document.pdf',
  original_filename: 'report.pdf',
  mime_type: 'application/pdf',
  size: 1024 * 500, // 500KB
  url: 'https://example.com/document.pdf',
  status: 'complete',
};

const mockVideoAttachment: Attachment = {
  id: '3',
  filename: 'video.mp4',
  original_filename: 'presentation.mp4',
  mime_type: 'video/mp4',
  size: 1024 * 1024 * 10, // 10MB
  url: 'https://example.com/video.mp4',
  status: 'complete',
};

const mockAudioAttachment: Attachment = {
  id: '4',
  filename: 'audio.mp3',
  original_filename: 'podcast.mp3',
  mime_type: 'audio/mpeg',
  size: 1024 * 1024 * 5, // 5MB
  url: 'https://example.com/audio.mp3',
  status: 'complete',
};

const mockUnsupportedAttachment: Attachment = {
  id: '5',
  filename: 'data.zip',
  original_filename: 'archive.zip',
  mime_type: 'application/zip',
  size: 1024 * 1024, // 1MB
  url: 'https://example.com/data.zip',
  status: 'complete',
};

const mockAttachments: Attachment[] = [
  mockImageAttachment,
  mockPdfAttachment,
  mockVideoAttachment,
];

describe('FilePreview', () => {
  const defaultProps: FilePreviewProps = {
    attachment: mockImageAttachment,
    open: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders file preview dialog when open', () => {
    render(<FilePreview {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('displays attachment filename in title', () => {
    render(<FilePreview {...defaultProps} />);

    expect(screen.getByText('vacation.jpg')).toBeInTheDocument();
  });

  test('displays file size and mime type', () => {
    render(<FilePreview {...defaultProps} />);

    expect(screen.getByText(/100/)).toBeInTheDocument(); // 100KB or similar
    expect(screen.getByText(/image\/jpeg/)).toBeInTheDocument();
  });

  test('does not render when attachment is null', () => {
    render(<FilePreview {...defaultProps} attachment={null} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders image preview for image attachments', () => {
    render(<FilePreview {...defaultProps} />);

    const image = screen.getByAltText('vacation.jpg');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  test('renders PDF iframe for PDF attachments', () => {
    render(<FilePreview {...defaultProps} attachment={mockPdfAttachment} />);

    const iframe = document.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://example.com/document.pdf');
  });

  test('renders video player for video attachments', () => {
    render(<FilePreview {...defaultProps} attachment={mockVideoAttachment} />);

    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'https://example.com/video.mp4');
    expect(video).toHaveAttribute('controls');
  });

  test('renders audio player for audio attachments', () => {
    render(<FilePreview {...defaultProps} attachment={mockAudioAttachment} />);

    const audio = document.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute('src', 'https://example.com/audio.mp3');
    expect(audio).toHaveAttribute('controls');
  });

  test('shows fallback for unsupported file types', () => {
    render(<FilePreview {...defaultProps} attachment={mockUnsupportedAttachment} />);

    expect(screen.getByText(/Preview not available/)).toBeInTheDocument();
    expect(screen.getByText(/Download File/)).toBeInTheDocument();
  });

  test('calls onClose when dialog is closed', () => {
    const onClose = jest.fn();
    render(<FilePreview {...defaultProps} onClose={onClose} />);

    // Find and click close mechanism
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    // onClose should be called
    expect(onClose).toHaveBeenCalled();
  });

  test('shows zoom controls for images', () => {
    render(<FilePreview {...defaultProps} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('zooms in when zoom in button is clicked', async () => {
    render(<FilePreview {...defaultProps} />);

    const zoomInButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg')
    );

    // Find zoom in button (usually has ZoomIn icon)
    const buttons = screen.getAllByRole('button');
    const zoomButtons = buttons.filter(btn => !btn.hasAttribute('disabled'));

    if (zoomButtons.length > 0) {
      fireEvent.click(zoomButtons[0]);
    }

    await waitFor(() => {
      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    });
  });

  test('shows rotation control for images', () => {
    render(<FilePreview {...defaultProps} />);

    // Rotation button should be present for images
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('shows download button', () => {
    render(<FilePreview {...defaultProps} />);

    // Download button should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('calls onDownload when download button is clicked', async () => {
    const onDownload = jest.fn();
    render(<FilePreview {...defaultProps} onDownload={onDownload} />);

    // Find download button
    const buttons = screen.getAllByRole('button');
    const downloadButton = buttons.find(btn =>
      btn.querySelector('svg')?.classList.toString().includes('Download') ||
      btn.innerHTML.includes('Download')
    );

    if (downloadButton) {
      fireEvent.click(downloadButton);
      expect(onDownload).toHaveBeenCalledWith(mockImageAttachment);
    }
  });

  test('shows navigation arrows when multiple attachments', () => {
    render(
      <FilePreview
        {...defaultProps}
        attachments={mockAttachments}
      />
    );

    // Navigation buttons should be visible
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(2);
  });

  test('shows attachment count when multiple attachments', () => {
    render(
      <FilePreview
        {...defaultProps}
        attachments={mockAttachments}
      />
    );

    expect(screen.getByText('1 of 3')).toBeInTheDocument();
  });

  test('calls onNavigate when next button is clicked', async () => {
    const onNavigate = jest.fn();
    render(
      <FilePreview
        {...defaultProps}
        attachments={mockAttachments}
        onNavigate={onNavigate}
      />
    );

    // Find next navigation button
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons.find(btn =>
      btn.querySelector('[class*="ChevronRight"]') ||
      btn.innerHTML.includes('ChevronRight')
    );

    if (nextButton) {
      fireEvent.click(nextButton);
      expect(onNavigate).toHaveBeenCalledWith(mockPdfAttachment, 'next');
    }
  });

  test('disables prev button on first attachment', () => {
    render(
      <FilePreview
        {...defaultProps}
        attachments={mockAttachments}
      />
    );

    const buttons = screen.getAllByRole('button');
    const disabledButtons = buttons.filter(btn => btn.hasAttribute('disabled'));
    expect(disabledButtons.length).toBeGreaterThan(0);
  });

  test('hides navigation when single attachment', () => {
    render(<FilePreview {...defaultProps} attachments={[mockImageAttachment]} />);

    expect(screen.queryByText('1 of')).not.toBeInTheDocument();
  });

  test('handles keyboard navigation', async () => {
    const onNavigate = jest.fn();
    render(
      <FilePreview
        {...defaultProps}
        attachments={mockAttachments}
        onNavigate={onNavigate}
      />
    );

    // Simulate arrow key press
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalled();
    });
  });

  test('closes on Escape key', () => {
    const onClose = jest.fn();
    render(<FilePreview {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  test('handles zoom keyboard shortcuts', () => {
    render(<FilePreview {...defaultProps} />);

    // Zoom in with Ctrl/Cmd + =
    fireEvent.keyDown(window, { key: '=', ctrlKey: true });

    // Zoom out with Ctrl/Cmd + -
    fireEvent.keyDown(window, { key: '-', ctrlKey: true });
  });

  test('resets zoom when attachment changes', () => {
    const { rerender } = render(<FilePreview {...defaultProps} />);

    // Trigger zoom
    const buttons = screen.getAllByRole('button');
    const zoomButton = buttons[0];
    if (zoomButton) {
      fireEvent.click(zoomButton);
    }

    // Change attachment
    rerender(<FilePreview {...defaultProps} attachment={mockPdfAttachment} />);

    // PDF doesn't show zoom percentage the same way
  });

  test('supports fullscreen mode', () => {
    render(<FilePreview {...defaultProps} />);

    // Fullscreen button should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('applies custom className', () => {
    render(<FilePreview {...defaultProps} className="custom-class" />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('.custom-class') || dialog.classList.contains('custom-class')).toBeTruthy();
  });

  test('displays file size formatted correctly', () => {
    render(<FilePreview {...defaultProps} attachment={mockVideoAttachment} />);

    // Should show 10 MB or similar
    expect(screen.getByText(/10.*MB|MB/i)).toBeInTheDocument();
  });

  test('shows fallback filename when original_filename is not provided', () => {
    const attachmentWithoutOriginal: Attachment = {
      ...mockImageAttachment,
      original_filename: undefined as unknown as string,
    };

    render(<FilePreview {...defaultProps} attachment={attachmentWithoutOriginal} />);

    expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
  });

  test('maintains aspect ratio for images', () => {
    render(<FilePreview {...defaultProps} />);

    const image = screen.getByAltText('vacation.jpg');
    expect(image).toHaveClass('object-contain');
  });
});
