import {
  Input as LobeInput,
  InputNumber as LobeInputNumber,
  InputPassword as LobeInputPassword,
  TextArea as LobeTextArea,
  type InputNumberProps,
  type InputPasswordProps,
  type InputProps,
  type TextAreaProps,
} from '@lobehub/ui';
import {
  Select as LobeSelect,
  SwitchRoot,
  SwitchThumb,
  type SelectProps,
  type SwitchChangeEventHandler,
  type SwitchSize,
} from '@lobehub/ui/base-ui';

function classes(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function DichaInput({ className, shadow = false, ...props }: InputProps) {
  return <LobeInput shadow={shadow} className={classes('dicha-control', className)} {...props} />;
}

export function DichaInputPassword({
  className,
  shadow = false,
  ...props
}: InputPasswordProps) {
  return (
    <LobeInputPassword shadow={shadow} className={classes('dicha-control', className)} {...props} />
  );
}

export function DichaInputNumber({ className, shadow = false, ...props }: InputNumberProps) {
  return (
    <LobeInputNumber shadow={shadow} className={classes('dicha-control', className)} {...props} />
  );
}

export function DichaTextArea({ className, shadow = false, resize = true, ...props }: TextAreaProps) {
  return (
    <LobeTextArea
      shadow={shadow}
      resize={resize}
      className={classes('dicha-control', className)}
      {...props}
    />
  );
}

export function DichaSelect<Value = string>({
  className,
  popupClassName,
  size = 'middle',
  variant = 'outlined',
  shadow = false,
  ...props
}: SelectProps<Value>) {
  return (
    <LobeSelect
      size={size}
      variant={variant}
      shadow={shadow}
      className={classes('dicha-control', className)}
      popupClassName={classes('dicha-select-popup', popupClassName)}
      {...props}
    />
  );
}

type DichaSwitchProps = {
  'aria-label'?: string;
  autoFocus?: boolean;
  checked?: boolean;
  className?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  onChange?: SwitchChangeEventHandler;
  size?: SwitchSize;
  tabIndex?: number;
  title?: string;
  value?: boolean;
};

export function DichaSwitch({
  checked,
  className,
  defaultChecked,
  disabled,
  onChange,
  size = 'default',
  value,
  ...props
}: DichaSwitchProps) {
  return (
    <SwitchRoot
      checked={value ?? checked}
      className={classes('dicha-control', className)}
      defaultChecked={defaultChecked}
      disabled={disabled}
      size={size}
      onCheckedChange={onChange}
      {...props}
    >
      <SwitchThumb size={size} />
    </SwitchRoot>
  );
}

export type { SelectOption, SelectOptions } from '@lobehub/ui/base-ui';
