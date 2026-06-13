import { useState } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  type TextInputProps, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n';

interface Props extends Omit<TextInputProps, 'secureTextEntry'> {
  style?: StyleProp<TextStyle>;
}

// TextInput with a built-in show/hide eye toggle. Pass the same `style`
// you'd give a normal field; the eye sits inside on the right.
export function PasswordInput({ style, ...rest }: Props) {
  const { C } = useTheme();
  const t = useT();
  const [show, setShow] = useState(false);

  return (
    <View style={styles.wrap}>
      <TextInput
        autoCapitalize="none"
        {...rest}
        style={[style, styles.input]}
        secureTextEntry={!show}
      />
      <TouchableOpacity
        onPress={() => setShow(v => !v)}
        style={styles.eye}
        hitSlop={8}
        accessibilityLabel={show ? t.auth.hidePassword : t.auth.showPassword}
      >
        <Icon name={show ? 'eyeOff' : 'eye'} size={20} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' } as ViewStyle,
  input: { paddingRight: 46 } as TextStyle,
  eye: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
});
