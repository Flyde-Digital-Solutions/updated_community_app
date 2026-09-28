import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TouchableOpacity, Text } from 'react-native';
import { InputField } from '../src/components/atoms/InputField';
import { OrangeButton } from '../src/components/atoms/OrangeButton';

describe('mandatory form controls', () => {
  it('shows an asterisk only for required input labels', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <>
          <InputField label="Mobile number" required />
          <InputField label="Company" />
        </>,
      );
    });
    const labels = tree.root.findAllByType(Text).map(node => node.props.children);
    expect(labels).toContainEqual(['Mobile number', ' *']);
    expect(labels).toContainEqual(['Company', '']);
  });

  it('keeps an incomplete button visually inactive but tappable for guidance', async () => {
    const submit = jest.fn();
    const explain = jest.fn();
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <OrangeButton label="Submit" disabled onPress={submit} onDisabledPress={explain} />,
      );
    });
    const button = tree.root.findByType(TouchableOpacity);
    expect(button.props.disabled).toBe(false);
    await ReactTestRenderer.act(() => button.props.onPress());
    expect(explain).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
  });
});
