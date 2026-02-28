import { useEffect, useState } from 'react';
import { Spin, Tabs, Table, message, Button, Space } from 'antd';
import { DownloadOutlined, SaveOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

interface ExcelPreviewProps {
  url: string;
  fileName: string;
  canEdit?: boolean;
}

interface SheetData {
  name: string;
  data: any[][];
  columns: { title: string; dataIndex: string; key: string; editable?: boolean }[];
}

export default function ExcelPreview({ url, fileName, canEdit = false }: ExcelPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [editedData, setEditedData] = useState<Record<string, any[][]>>({});

  useEffect(() => {
    let cancelled = false;

    const loadExcel = async () => {
      setLoading(true);
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch Excel file');
        }

        const arrayBuffer = await response.arrayBuffer();

        if (cancelled) return;

        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        setWorkbook(wb);

        const sheetsData: SheetData[] = [];
        const initialEditedData: Record<string, any[][]> = {};

        wb.SheetNames.forEach((sheetName) => {
          const worksheet = wb.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

          if (jsonData.length === 0) {
            sheetsData.push({
              name: sheetName,
              data: [],
              columns: [],
            });
            initialEditedData[sheetName] = [];
            return;
          }

          const headers = jsonData[0] as any[];
          const columns = headers.map((header, index) => ({
            title: String(header || `列 ${index + 1}`),
            dataIndex: `col_${index}`,
            key: `col_${index}`,
            editable: canEdit,
          }));

          const data = jsonData.slice(1).map((row: any[], rowIndex) => {
            const rowData: any = { key: rowIndex };
            headers.forEach((_, colIndex) => {
              rowData[`col_${colIndex}`] = row[colIndex] ?? '';
            });
            return rowData;
          });

          sheetsData.push({
            name: sheetName,
            data,
            columns,
          });

          initialEditedData[sheetName] = jsonData;
        });

        setSheets(sheetsData);
        setEditedData(initialEditedData);
        if (sheetsData.length > 0) {
          setActiveSheet(sheetsData[0].name);
        }
      } catch (err) {
        console.error('Failed to load Excel:', err);
        message.error('Excel 文件加载失败');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadExcel();

    return () => {
      cancelled = true;
    };
  }, [url, canEdit]);

  const handleDownload = () => {
    if (!workbook) return;

    const newWb = XLSX.utils.book_new();
    sheets.forEach((sheet) => {
      const data = editedData[sheet.name] || [];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(newWb, ws, sheet.name);
    });

    XLSX.writeFile(newWb, fileName || 'download.xlsx');
  };

  const handleSave = () => {
    // message.success('保存功能需要后端 API 支持');
  };

  const renderSheet = (sheet: SheetData) => {
    return (
      <Table
        columns={sheet.columns}
        dataSource={sheet.data}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 行`,
        }}
        scroll={{ x: 'max-content', y: 400 }}
        size="small"
        bordered
      />
    );
  };

  const tabItems = sheets.map((sheet) => ({
    key: sheet.name,
    label: sheet.name,
    children: renderSheet(sheet),
  }));

  return (
    <div className="excel-preview">
      <Spin spinning={loading}>
        <div className="excel-toolbar">
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              下载
            </Button>
            {canEdit && (
              <Button icon={<SaveOutlined />} type="primary" onClick={handleSave}>
                保存
              </Button>
            )}
          </Space>
        </div>
        <div className="excel-container">
          {sheets.length > 0 ? (
            <Tabs
              activeKey={activeSheet}
              onChange={setActiveSheet}
              items={tabItems}
              type="card"
            />
          ) : (
            <div className="empty-state">暂无数据</div>
          )}
        </div>
      </Spin>
    </div>
  );
}
