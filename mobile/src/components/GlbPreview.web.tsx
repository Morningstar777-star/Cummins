import { Image, StyleSheet, View } from 'react-native';

import { getCategoryThumbnailUrl } from './categoryThumbnails';

type Props = {
  categoryId?: string;
  thumbnailUrl?: string;
};

export function GlbPreview({ categoryId, thumbnailUrl }: Props) {
  const imageUri = getCategoryThumbnailUrl(categoryId, thumbnailUrl);

  return (
    <View style={styles.wrap}>
      <Image source={{ uri: imageUri }} style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    backgroundColor: '#F4E8D6',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
});
