import React, { useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import {
  Button,
  Cascader,
  Checkbox,
  ColorPicker,
  DatePicker,
  Flex,
  Input,
  InputNumber,
  Radio,
  Rate,
  Select,
  Slider,
  Switch,
  TimePicker,
  Transfer,
  TreeSelect,
  Upload,
  message,
} from 'antd'
import { DeleteOutlined, InboxOutlined, LoadingOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import type { NativeFormNode, NativeFormOptionItem } from '@/types'
import dayjs from 'dayjs'
import NativeFormCheckableTag from '@/native-form/runtime/components/native-form-checkable-tag'
import NativeFormPlate from '@/native-form/runtime/components/native-form-plate'
import NativeFormVehicleModel from '@/native-form/runtime/components/native-form-vehicle-model'

interface NativeFormFieldControlProps {
  field: NativeFormNode
  options?: NativeFormOptionItem[]
  value?: any
  onValueChange?: (value: any) => void
  onUpload?: (file: File) => Promise<any>
  onClick?: () => void
}

const toOptions = (
  options?: NativeFormOptionItem[],
): Array<{ label: string; value: string | number | boolean; children?: any[] }> =>
  (options || []).map((item) => ({
    label: item.label,
    value: item.value,
    children: item.children ? toOptions(item.children) : undefined,
  }))

const normalizeRangeValue = (value: any) => (Array.isArray(value) ? value : [])
const normalizeArrayValue = (value: any) => (Array.isArray(value) ? value : [])

const normalizeSliderNumber = (value: any, fallback: number) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const nextValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(nextValue) ? nextValue : fallback
}

const normalizeSliderValue = (value: any, field: NativeFormNode) => {
  if (!field.componentProps?.range) {
    return value
  }

  const min = normalizeSliderNumber(field.componentProps?.min, 0)
  const max = normalizeSliderNumber(field.componentProps?.max, 100)

  if (Array.isArray(value)) {
    return [
      normalizeSliderNumber(value[0], min),
      normalizeSliderNumber(value[1], max),
    ]
  }

  return [normalizeSliderNumber(value, min), max]
}

const normalizeUploadValue = (value: any): UploadFile[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item, index) => ({
    uid: item?.uid || `native-upload-${index}`,
    name: item?.name || item?.filename || item?.url || `文件${index + 1}`,
    status: item?.status || 'done',
    url: item?.url,
    response: item,
  }))
}

const getValueByPath = (source: any, path?: string) => {
  if (!source || !path?.trim()) {
    return undefined
  }

  return path
    .split('.')
    .map(key => key.trim())
    .filter(Boolean)
    .reduce<any>((current, key) => current?.[key], source)
}

const getUploadItemUrl = (item?: any, responseUrlField?: string) => {
  const responseUrl = getValueByPath(item?.response, responseUrlField)

  return responseUrl || item?.url || item?.thumbUrl || item?.response?.url || item?.response?.data?.url
}

const getUploadPreviewUrl = (fileList: UploadFile[], responseUrlField?: string) => {
  const firstFile = fileList[0]
  return getUploadItemUrl(firstFile, responseUrlField)
}

const normalizeUploadResponseValue = (
  file: UploadFile,
  responseUrlField?: string,
) => {
  const responseUrl = getUploadItemUrl(file, responseUrlField)
  const nextFile = {
    ...file,
    url: responseUrl || file.url,
  }

  if (file.response) {
    return responseUrl && !file.response.url
      ? { ...nextFile, response: { ...file.response, url: responseUrl } }
      : nextFile
  }

  return nextFile
}

const normalizeUploadFileList = (
  fileList: UploadFile[],
  responseUrlField?: string,
) => {
  return fileList.map(item => normalizeUploadResponseValue(item, responseUrlField))
}

const isPictureCardUpload = (listType?: string) =>
  listType === 'picture-card' || listType === 'picture-circle'

const resolveUploadButtonType = (buttonType?: string, legacyListType?: string) => {
  if (buttonType === 'picture-card' || buttonType === 'picture-circle') {
    return buttonType
  }

  if (legacyListType === 'picture-card' || legacyListType === 'picture-circle') {
    return legacyListType
  }

  return 'button'
}

const isImageUploadFile = (file: UploadFile) => {
  const url = file.url || file.thumbUrl || getUploadItemUrl(file)
  const type = file.type || (file.response as any)?.type || (file.response as any)?.content_type

  if (type?.startsWith?.('image/')) {
    return true
  }

  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url || '')
}

const getUploadErrorMessage = (error: any) => {
  const responseData = error?.response?.data
  const candidates = [
    typeof responseData === 'string' ? responseData : undefined,
    responseData?.message,
    responseData?.msg,
    responseData?.error,
    responseData?.detail,
    responseData?.data?.message,
    responseData?.data?.msg,
    error?.message,
  ]
  const messageText = candidates.find(item => typeof item === 'string' && item.trim())

  if (messageText) {
    return messageText
  }

  if (error?.response?.status) {
    return `上传失败：${error.response.status}${error.response.statusText ? ` ${error.response.statusText}` : ''}`
  }

  return '上传失败，请稍后重试'
}

const toTransferOptions = (options?: NativeFormOptionItem[]) =>
  (options || []).map(item => ({
    key: String(item.value),
    title: item.label,
    description: item.text || item.label,
    disabled: item.disabled === true,
  }))

const isAcceptedFile = (accept: string | undefined, file: File) => {
  if (!accept?.trim()) {
    return true
  }

  const fileName = file.name.toLowerCase()
  const mimeType = file.type.toLowerCase()

  return accept
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.startsWith('.')) {
        return fileName.endsWith(rule)
      }
      if (rule.endsWith('/*')) {
        return mimeType.startsWith(rule.slice(0, -1))
      }
      return mimeType === rule
    })
}

const NativeFormFieldControl: React.FC<NativeFormFieldControlProps> = ({
  field,
  options,
  value,
  onValueChange,
  onUpload,
  onClick,
}) => {
  const [uploading, setUploading] = useState(false)
  const controlStyle = {
    width: field.styleProps?.width || '100%',
    height: field.styleProps?.height || undefined,
  }
  const commonProps: Record<string, any> = {
    disabled: field.disabled,
    style: controlStyle,
    ...(field.componentProps || {}),
    placeholder: field.placeholder,
  }
  const timePickerCommonProps = { ...commonProps }
  delete timePickerCommonProps.picker
  delete timePickerCommonProps.showTime
  delete timePickerCommonProps.disablePastDates

  const mergedOptions = useMemo(() => toOptions(options || field.options), [field.options, options])
  const normalizedTransferValue = useMemo(
    () => normalizeArrayValue(value).map(item => String(item)),
    [value],
  )
  const [transferTargetKeys, setTransferTargetKeys] = useState<string[]>(normalizedTransferValue)
  const [transferSelectedKeys, setTransferSelectedKeys] = useState<string[]>([])

  useEffect(() => {
    if (field.type !== 'transfer') {
      return
    }

    setTransferTargetKeys(normalizedTransferValue)
  }, [field.type, normalizedTransferValue])

  const handleChange = (nextValue: any) => {
    onValueChange?.(nextValue)
  }

  const handleInputNumberChange = (nextValue: string | number | null) => {
    if (nextValue === null || nextValue === '') {
      handleChange(undefined)
      return
    }

    if (field.componentProps?.stringMode) {
      handleChange(nextValue)
      return
    }

    const normalizedValue = typeof nextValue === 'number' ? nextValue : Number(nextValue)
    handleChange(Number.isNaN(normalizedValue) ? undefined : normalizedValue)
  }

  const disabledDate = field.componentProps?.disablePastDates
    ? (current: dayjs.Dayjs) => current.isBefore(dayjs().startOf('day'))
    : undefined

  const uploadFileList = normalizeUploadValue(value)
  const uploadListType = field.uploadConfig?.listType
  const uploadButtonType = resolveUploadButtonType(
    field.uploadConfig?.buttonType,
    field.uploadConfig?.listType,
  )
  const uploadResponseUrlField = field.uploadConfig?.responseUrlField
  const isUploadPictureCard = isPictureCardUpload(uploadButtonType)
  const isSinglePictureCardUpload = isUploadPictureCard && !field.uploadConfig?.multiple
  const isPictureCircleUpload = uploadButtonType === 'picture-circle'
  const runtimeUploadListType: UploadProps['listType'] = isUploadPictureCard
    ? uploadButtonType as UploadProps['listType']
    : uploadListType === 'picture'
      ? 'picture'
      : 'text'
  const uploadPreviewUrl = getUploadPreviewUrl(uploadFileList, uploadResponseUrlField)
  const uploadLoading = uploading || uploadFileList.some(item => item.status === 'uploading')
  const uploadCardStyle: React.CSSProperties = {
    width: 102,
    height: 102,
    border: '1px dashed var(--ant-color-border, #d9d9d9)',
    borderRadius: isPictureCircleUpload ? '50%' : 8,
    background: 'var(--ant-color-fill-alter, rgba(0, 0, 0, 0.02))',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  const uploadPreviewImage = uploadPreviewUrl ? (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: isPictureCircleUpload ? '50%' : undefined,
          overflow: isPictureCircleUpload ? 'hidden' : undefined,
        }}
      >
        <img
          draggable={false}
          src={uploadPreviewUrl}
          alt={field.label || '上传图片'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      {!field.disabled ? (
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={(event) => {
            event.stopPropagation()
            event.preventDefault()
            handleChange([])
          }}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 24,
            height: 24,
            minWidth: 24,
            padding: 0,
          }}
        />
      ) : null}
    </div>
  ) : null

  const uploadBefore: UploadProps['beforeUpload'] = (file) => {
    const maxSizeMb = field.uploadConfig?.maxSizeMb
    if (maxSizeMb && file.size / 1024 / 1024 > maxSizeMb) {
      message.warning(`单文件大小不能超过 ${maxSizeMb}MB`)
      return Upload.LIST_IGNORE
    }

    if (!isAcceptedFile(field.uploadConfig?.accept, file as File)) {
      message.warning(`文件类型不符合要求：${field.uploadConfig?.accept}`)
      return Upload.LIST_IGNORE
    }

    return true
  }

  const uploadProps: UploadProps = {
    action: field.uploadConfig?.action,
    accept: field.uploadConfig?.accept,
    multiple: field.uploadConfig?.multiple,
    listType: runtimeUploadListType,
    fileList: uploadFileList,
    disabled: field.disabled,
    showUploadList: isSinglePictureCardUpload ? false : undefined,
    isImageUrl: runtimeUploadListType !== 'text' ? isImageUploadFile : undefined,
    beforeUpload: uploadBefore,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const result = await onUpload?.(file as File)
        const nextFile = file as UploadFile
        const responseUrl = getValueByPath(result, uploadResponseUrlField) || getUploadItemUrl({ response: result })
        const nextValueItem = normalizeUploadResponseValue({
          ...nextFile,
          status: 'done',
          url: responseUrl,
          response: result,
        }, uploadResponseUrlField)

        setUploading(false)
        if (isSinglePictureCardUpload) {
          handleChange([nextValueItem])
        }
        onSuccess?.(result, file as any)
      } catch (error) {
        setUploading(false)
        const errorMessage = getUploadErrorMessage(error)
        message.error(errorMessage)
        console.error('原生表单文件上传失败:', error)
        onError?.(new Error(errorMessage))
      }
    },
    onChange: ({ fileList }) => {
      setUploading(fileList.some(item => item.status === 'uploading'))
      const nextValue = normalizeUploadFileList(
        fileList,
        uploadResponseUrlField,
      )
      handleChange(nextValue)
    },
    onRemove: (file) => {
      const currentList = Array.isArray(value) ? value : []
      const nextValue = currentList.filter((item: any) => {
        const compareKey = item?.uid || item?.url || item?.name
        return compareKey !== (file.uid || file.url || file.name)
      })
      handleChange(nextValue)
    },
  }

  switch (field.type) {
    case 'input':
      if (field.componentProps?.password) {
        return (
          <Input.Password
            {...commonProps}
            value={value}
            onChange={(event) => handleChange(event.target.value)}
          />
        )
      }

      return (
        <Input
          {...commonProps}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
        />
      )
    case 'password':
      return (
        <Input.Password
          {...commonProps}
          value={value}
          visibilityToggle={field.componentProps?.visibilityToggle}
          onChange={(event) => handleChange(event.target.value)}
        />
      )
    case 'textarea':
      return (
        <Input.TextArea
          {...commonProps}
          value={value}
          autoSize={field.componentProps?.autoSize}
          readOnly={field.componentProps?.readOnly}
          onChange={(event) => handleChange(event.target.value)}
        />
      )
    case 'inputNumber':
      return (
        <InputNumber
          {...commonProps}
          value={value}
          readOnly={field.componentProps?.readOnly}
          step={field.componentProps?.step}
          controls={field.componentProps?.controls}
          stringMode={field.componentProps?.stringMode}
          onChange={handleInputNumberChange}
        />
      )
    case 'select':
      return (
        <Select
          {...commonProps}
          value={value}
          options={mergedOptions}
          notFoundContent={field.componentProps?.searchPlaceholder}
          maxTagCount={field.componentProps?.maxTagCount}
          onChange={handleChange}
        />
      )
    case 'transfer':
      return (
        <Transfer
          {...commonProps}
          dataSource={toTransferOptions(options || field.options)}
          targetKeys={transferTargetKeys}
          selectedKeys={transferSelectedKeys}
          oneWay={field.componentProps?.oneWay}
          showSearch={field.componentProps?.showSearch
            ? { placeholder: field.componentProps?.searchPlaceholder }
            : false}
          locale={{
            searchPlaceholder: field.componentProps?.searchPlaceholder,
          }}
          titles={field.componentProps?.titles}
          operations={field.componentProps?.operations}
          render={item => item.title}
          onChange={targetKeys => {
            const nextTargetKeys = targetKeys.map(item => String(item))
            setTransferTargetKeys(nextTargetKeys)
            setTransferSelectedKeys([])
            handleChange(nextTargetKeys)
          }}
          onSelectChange={(sourceSelectedKeys, targetSelectedKeys) => {
            setTransferSelectedKeys([
              ...sourceSelectedKeys.map(item => String(item)),
              ...targetSelectedKeys.map(item => String(item)),
            ])
          }}
        />
      )
    case 'checkableTag':
      return (
        <NativeFormCheckableTag
          value={normalizeArrayValue(value)}
          options={options || field.options}
          disabled={field.disabled}
          showAsRadio={field.componentProps?.showAsRadio}
          onChange={handleChange}
        />
      )
    case 'formPlate':
      return (
        <NativeFormPlate
          value={value}
          disabled={field.disabled}
          readOnly={field.componentProps?.readOnly}
          allowClear={field.componentProps?.allowClear}
          placeholder={field.placeholder}
          province={field.componentProps?.province}
          isShowColor={field.componentProps?.isShowColor}
          isShowNoPlate={field.componentProps?.isShowNoPlate}
          isShowNoLimit={field.componentProps?.isShowNoLimit}
          accurate={field.componentProps?.accurate}
          style={controlStyle}
          onChange={handleChange}
        />
      )
    case 'formVehicleModel':
      return (
        <NativeFormVehicleModel
          value={value}
          disabled={field.disabled}
          readOnly={field.componentProps?.readOnly}
          allowClear={field.componentProps?.allowClear}
          bordered={field.componentProps?.bordered}
          placeholder={field.placeholder}
          searchPlaceholder={field.componentProps?.searchPlaceholder}
          separator={field.componentProps?.separator}
          maxHeight={field.componentProps?.maxHeight}
          hotBrands={field.componentProps?.hotBrands}
          mode={field.componentProps?.mode}
          style={controlStyle}
          onChange={handleChange}
        />
      )
    case 'radioGroup':
      return (
        <Radio.Group
          {...commonProps}
          className={classNames(field.componentProps?.className, 'native-form-choice-group', {
            'native-form-choice-group--vertical': field.componentProps?.direction === 'vertical',
          })}
          vertical={field.componentProps?.direction === 'vertical'}
          value={value}
          options={mergedOptions}
          onChange={(event) => handleChange(event.target.value)}
        />
      )
    case 'checkboxGroup':
      return (
        <Checkbox.Group
          {...commonProps}
          className={classNames(field.componentProps?.className, 'native-form-choice-group', {
            'native-form-choice-group--vertical': field.componentProps?.direction === 'vertical',
          })}
          value={value}
          options={mergedOptions}
          onChange={handleChange}
        />
      )
    case 'cascader':
      return (
        <Cascader
          {...commonProps}
          value={value}
          showSearch={field.componentProps?.showSearch}
          multiple={field.componentProps?.multiple}
          changeOnSelect={field.componentProps?.changeOnSelect}
          options={mergedOptions as any}
          onChange={handleChange}
        />
      )
    case 'treeSelect':
      return (
        <TreeSelect
          {...commonProps}
          value={value}
          treeData={mergedOptions as any}
          multiple={field.componentProps?.multiple}
          treeCheckable={field.componentProps?.treeCheckable}
          treeDefaultExpandAll={field.componentProps?.treeDefaultExpandAll}
          showCheckedStrategy={field.componentProps?.showCheckedStrategy}
          onChange={handleChange}
        />
      )
    case 'datePicker':
      return (
        <DatePicker
          {...commonProps}
          picker={field.componentProps?.picker || 'date'}
          showTime={(field.componentProps?.picker || 'date') === 'date' ? field.componentProps?.showTime : undefined}
          disabledDate={disabledDate}
          value={value ? dayjs(String(value), field.componentProps?.format) : value}
          onChange={(_, dateString) => handleChange(dateString)}
        />
      )
    case 'dateRangePicker':
      return (
        <DatePicker.RangePicker
          {...commonProps}
          picker={field.componentProps?.picker || 'date'}
          showTime={(field.componentProps?.picker || 'date') === 'date' ? field.componentProps?.showTime : undefined}
          disabledDate={disabledDate}
          separator={field.componentProps?.separator}
          placeholder={field.componentProps?.placeholder}
          value={normalizeRangeValue(value).map(item =>
            item ? dayjs(String(item), field.componentProps?.format) : item,
          ) as any}
          onChange={(_, dateStrings) => handleChange(dateStrings)}
        />
      )
    case 'timePicker':
      return (
        <TimePicker
          {...timePickerCommonProps}
          use12Hours={field.componentProps?.use12Hours}
          hourStep={field.componentProps?.hourStep}
          minuteStep={field.componentProps?.minuteStep}
          secondStep={field.componentProps?.secondStep}
          value={value ? dayjs(String(value), field.componentProps?.format || 'HH:mm:ss') : value}
          onChange={(_, timeString) => handleChange(timeString)}
        />
      )
    case 'timeRangePicker':
      return (
        <TimePicker.RangePicker
          {...timePickerCommonProps}
          use12Hours={field.componentProps?.use12Hours}
          hourStep={field.componentProps?.hourStep}
          minuteStep={field.componentProps?.minuteStep}
          secondStep={field.componentProps?.secondStep}
          separator={field.componentProps?.separator}
          placeholder={field.componentProps?.placeholder}
          value={normalizeRangeValue(value).map(item =>
            item ? dayjs(String(item), field.componentProps?.format || 'HH:mm:ss') : item,
          ) as any}
          onChange={(_, timeStrings) => handleChange(timeStrings)}
        />
      )
    case 'upload':
      if (field.uploadConfig?.draggable) {
        return (
          <Upload.Dragger {...uploadProps}>
            {isSinglePictureCardUpload && uploadPreviewImage ? (
              <div style={{ width: '100%', height: 160 }}>{uploadPreviewImage}</div>
            ) : (
              <>
                <p className="ant-upload-drag-icon">
                  {uploadLoading ? <LoadingOutlined /> : <InboxOutlined />}
                </p>
                <p className="ant-upload-text">
                  {field.componentProps?.buttonText || '点击或拖拽文件到此区域上传'}
                </p>
                <p className="ant-upload-hint">
                  {field.uploadConfig?.maxSizeMb
                    ? `单文件不超过 ${field.uploadConfig.maxSizeMb}MB`
                    : '支持点击选择或直接拖拽上传'}
                </p>
              </>
            )}
          </Upload.Dragger>
        )
      }

      if (isUploadPictureCard) {
        const uploadButton = (
          <button
            type="button"
            disabled={field.disabled}
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              background: 'none',
              padding: 0,
              cursor: field.disabled ? 'not-allowed' : 'pointer',
              color: 'inherit',
            }}
          >
            {uploadLoading ? <LoadingOutlined /> : <PlusOutlined />}
            <div style={{ marginTop: 8 }}>{field.componentProps?.buttonText || '上传'}</div>
          </button>
        )

        if (!isSinglePictureCardUpload) {
          return (
            <Flex vertical gap={8}>
              <Upload {...uploadProps}>{uploadButton}</Upload>
              {field.uploadConfig?.maxSizeMb ? (
                <span>{`单文件不超过 ${field.uploadConfig.maxSizeMb}MB`}</span>
              ) : null}
              {field.uploadConfig?.accept ? (
                <span>{`允许格式：${field.uploadConfig.accept}`}</span>
              ) : null}
            </Flex>
          )
        }

        return (
          <Flex vertical gap={8}>
            <Upload {...uploadProps}>
              <div style={uploadCardStyle}>
                {uploadPreviewImage ? (
                  uploadPreviewImage
                ) : (
                  uploadButton
                )}
              </div>
            </Upload>
            {field.uploadConfig?.maxSizeMb ? (
              <span>{`单文件不超过 ${field.uploadConfig.maxSizeMb}MB`}</span>
            ) : null}
            {field.uploadConfig?.accept ? (
              <span>{`允许格式：${field.uploadConfig.accept}`}</span>
            ) : null}
          </Flex>
        )
      }

      return (
        <Upload {...uploadProps}>
          <Flex vertical gap={8}>
            <Button icon={<UploadOutlined />} disabled={field.disabled}>
              {field.componentProps?.buttonText || field.label || '点击上传'}
            </Button>
            {field.uploadConfig?.maxSizeMb ? (
              <span>{`单文件不超过 ${field.uploadConfig.maxSizeMb}MB`}</span>
            ) : null}
            {field.uploadConfig?.accept ? (
              <span>{`允许格式：${field.uploadConfig.accept}`}</span>
            ) : null}
          </Flex>
        </Upload>
      )
    case 'switch':
      return <Switch {...commonProps} checked={Boolean(value)} onChange={handleChange} />
    case 'colorPicker':
      return (
        <ColorPicker
          {...commonProps}
          value={value}
          format={field.componentProps?.format}
          showText={field.componentProps?.showText}
          onChange={(_, colorString) => handleChange(colorString)}
        />
      )
    case 'slider':
      return (
        <Slider
          {...commonProps}
          value={normalizeSliderValue(value, field)}
          min={field.componentProps?.min}
          max={field.componentProps?.max}
          step={field.componentProps?.step}
          range={field.componentProps?.range}
          dots={field.componentProps?.dots}
          reverse={field.componentProps?.reverse}
          included={field.componentProps?.included}
          marks={field.componentProps?.marks}
          tooltip={{ open: field.componentProps?.tooltipOpen ? true : undefined }}
          onChange={handleChange}
        />
      )
    case 'rate':
      return (
        <Rate
          {...commonProps}
          value={value}
          count={field.componentProps?.count}
          allowHalf={field.componentProps?.allowHalf}
          allowClear={field.componentProps?.allowClear}
          tooltips={field.componentProps?.tooltips}
          onChange={handleChange}
        />
      )
    case 'button':
      return (
        <Button
          type={field.componentProps?.buttonType || 'primary'}
          disabled={field.disabled}
          onClick={onClick}
        >
          {field.componentProps?.text || field.label || '按钮'}
        </Button>
      )
    default:
      return null
  }
}

export default NativeFormFieldControl
