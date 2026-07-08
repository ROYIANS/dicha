import type { Key } from '@heroui/react';
import type { ComponentProps, ReactNode } from 'react';
import {
  Checkbox,
  Header,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  Switch,
  Tabs,
  TextArea,
} from '@heroui/react';

type Option = {
  value: string;
  label: ReactNode;
  textValue?: string;
  disabled?: boolean;
};

type OptionGroup = {
  label: ReactNode;
  options: Option[];
};

type HeroTextInputProps = Omit<ComponentProps<typeof Input>, 'onChange'> & {
  onChange?: (value: string) => void;
};

export function HeroTextInput({ onChange, fullWidth = true, ...props }: HeroTextInputProps) {
  return <Input fullWidth={fullWidth} onChange={(event) => onChange?.(event.target.value)} {...props} />;
}

type HeroTextAreaProps = Omit<ComponentProps<typeof TextArea>, 'onChange'> & {
  onChange?: (value: string) => void;
};

export function HeroTextArea({ onChange, fullWidth = true, ...props }: HeroTextAreaProps) {
  return <TextArea fullWidth={fullWidth} onChange={(event) => onChange?.(event.target.value)} {...props} />;
}

type HeroNumberInputProps = Omit<ComponentProps<typeof NumberField>, 'onChange' | 'children'> & {
  label?: ReactNode;
  inputClassName?: string;
  onChange?: (value: number | undefined) => void;
};

export function HeroNumberInput({
  label,
  inputClassName,
  onChange,
  ...props
}: HeroNumberInputProps) {
  return (
    <NumberField onChange={onChange} {...props}>
      {label ? <Label>{label}</Label> : null}
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input className={inputClassName} />
        <NumberField.IncrementButton />
      </NumberField.Group>
    </NumberField>
  );
}

type HeroSelectProps = Omit<ComponentProps<typeof Select>, 'children' | 'value' | 'onChange'> & {
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options?: Option[];
  groups?: OptionGroup[];
  emptyLabel?: ReactNode;
};

export function HeroSelect({
  label,
  value,
  onChange,
  options,
  groups,
  emptyLabel,
  placeholder,
  className,
  ...props
}: HeroSelectProps) {
  const selectedValue = value ? value : emptyLabel ? EMPTY_SELECT_VALUE : null;
  return (
    <Select
      value={selectedValue}
      onChange={(next) => onChange(keyToValue(next))}
      placeholder={placeholder}
      className={className ?? 'w-full'}
      {...props}
    >
      {label ? <Label>{label}</Label> : null}
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {emptyLabel ? (
            <ListBox.Item id={EMPTY_SELECT_VALUE} textValue={String(emptyLabel)}>
              {emptyLabel}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ) : null}
          {(groups ?? []).map((group) => (
            <ListBox.Section key={String(group.label)}>
              <Header>{group.label}</Header>
              {group.options.map((option) => (
                <ListBox.Item
                  key={option.value}
                  id={option.value}
                  textValue={option.textValue ?? String(option.label)}
                  isDisabled={option.disabled}
                >
                  {option.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox.Section>
          ))}
          {(options ?? []).map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              textValue={option.textValue ?? String(option.label)}
              isDisabled={option.disabled}
            >
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

type HeroSwitchProps = Omit<ComponentProps<typeof Switch>, 'children' | 'onChange'> & {
  label: ReactNode;
  showLabel?: boolean;
  onChange: (checked: boolean) => void;
};

export function HeroSwitch({ label, showLabel = true, onChange, ...props }: HeroSwitchProps) {
  return (
    <Switch onChange={onChange} {...props}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        {showLabel ? label : <span className="sr-only">{label}</span>}
      </Switch.Content>
    </Switch>
  );
}

type HeroCheckboxProps = Omit<ComponentProps<typeof Checkbox>, 'children' | 'onChange'> & {
  label: ReactNode;
  onChange: (checked: boolean) => void;
};

export function HeroCheckbox({ label, onChange, ...props }: HeroCheckboxProps) {
  return (
    <Checkbox onChange={onChange} {...props}>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        {label}
      </Checkbox.Content>
    </Checkbox>
  );
}

type HeroTabsProps<T extends string> = Omit<
  ComponentProps<typeof Tabs>,
  'children' | 'selectedKey' | 'onSelectionChange'
> & {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ value: T; label: ReactNode; icon?: ReactNode; panel: ReactNode }>;
  ariaLabel: string;
};

export function HeroTabs<T extends string>({
  value,
  onChange,
  items,
  ariaLabel,
  ...props
}: HeroTabsProps<T>) {
  return (
    <Tabs selectedKey={value} onSelectionChange={(key) => onChange(String(key) as T)} {...props}>
      <Tabs.ListContainer>
        <Tabs.List aria-label={ariaLabel}>
          {items.map((item, index) => (
            <Tabs.Tab key={item.value} id={item.value}>
              {index > 0 ? <Tabs.Separator /> : null}
              {item.icon}
              {item.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {items.map((item) => (
        <Tabs.Panel key={item.value} id={item.value}>
          {item.panel}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

const EMPTY_SELECT_VALUE = '__hero_empty__';

function keyToValue(key: Key | Key[] | null) {
  if (Array.isArray(key)) return key[0] == null ? '' : String(key[0]);
  if (key == null || key === EMPTY_SELECT_VALUE) return '';
  return String(key);
}
