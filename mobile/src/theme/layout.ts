import { Platform, useWindowDimensions } from 'react-native';

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const isLargeDesktop = width >= 1280;
  const isWeb = Platform.OS === 'web';

  const pageHorizontalPadding = isWeb
    ? (isDesktop ? Math.round(width * 0.025) : isTablet ? 20 : 14)
    : (isDesktop ? 28 : isTablet ? 20 : 14);
  const maxContentWidth = isWeb
    ? width  // web: use full viewport, padding handles the margins
    : isLargeDesktop ? 1200 : isDesktop ? 1040 : isTablet ? 920 : width;
  const contentWidth = Math.max(0, Math.min(width - pageHorizontalPadding * 2, maxContentWidth));

  const productColumns = width >= 1300 ? 4 : width >= 960 ? 3 : 2;
  const quizColumns = width >= 1200 ? 3 : 2;

  return {
    width,
    height,
    isWeb,
    isTablet,
    isDesktop,
    pageHorizontalPadding,
    contentWidth,
    productColumns,
    quizColumns,
  };
}
