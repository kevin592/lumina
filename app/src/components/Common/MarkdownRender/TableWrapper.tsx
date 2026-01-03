import React from 'react';
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from "@heroui/react";
import { Pagination } from "@heroui/react";

// 定义表格数据结构
interface ParsedTableData {
  headers: string[];
  rows: string[][];
}

interface TableWrapperProps {
  children?: React.ReactNode;
}

/**
 * 安全地从 React 元素中提取文本内容
 */
function extractTextFromElement(element: React.ReactNode): string {
  if (element === null || element === undefined) {
    return '';
  }

  if (typeof element === 'string' || typeof element === 'number') {
    return String(element);
  }

  if (Array.isArray(element)) {
    return element.map(extractTextFromElement).join('');
  }

  if (React.isValidElement(element)) {
    const { children } = element.props;
    return extractTextFromElement(children);
  }

  return '';
}

/**
 * 解析表格数据
 */
function parseTableDataSafely(children: React.ReactNode | undefined): ParsedTableData {
  if (!children) {
    return { headers: [], rows: [] };
  }

  const childrenArray = React.Children.toArray(children);
  if (childrenArray.length < 2) {
    return { headers: [], rows: [] };
  }

  const [theadElement, tbodyElement] = childrenArray;

  // 提取表头
  const headers: string[] = [];
  if (React.isValidElement(theadElement)) {
    const theadChildren = theadElement.props.children;
    const trElement = Array.isArray(theadChildren) ? theadChildren[0] : theadChildren;

    if (React.isValidElement(trElement)) {
      const thElements = trElement.props.children;
      const thArray = Array.isArray(thElements) ? thElements : [thElements];

      thArray.forEach((th: React.ReactNode) => {
        if (React.isValidElement(th)) {
          headers.push(extractTextFromElement(th.props.children));
        } else if (th !== null && th !== undefined) {
          headers.push(extractTextFromElement(th));
        }
      });
    }
  }

  // 提取表格行
  const rows: string[][] = [];
  if (React.isValidElement(tbodyElement)) {
    const trElements = tbodyElement.props.children;
    const trArray = Array.isArray(trElements) ? trElements : [trElements];

    trArray.forEach((tr: React.ReactNode) => {
      if (React.isValidElement(tr)) {
        const tdElements = tr.props.children;
        const tdArray = Array.isArray(tdElements) ? tdElements : [tdElements];

        const row: string[] = [];
        tdArray.forEach((td: React.ReactNode) => {
          if (React.isValidElement(td)) {
            row.push(extractTextFromElement(td.props.children));
          } else if (td !== null && td !== undefined) {
            row.push(extractTextFromElement(td));
          } else {
            row.push('');
          }
        });
        rows.push(row);
      }
    });
  }

  return { headers, rows };
}

/**
 * TableWrapper 组件
 *
 * 将 Markdown 表格转换为 HeroUI Table 组件
 */
export const TableWrapper: React.FC<TableWrapperProps> = ({ children }) => {
  const { headers, rows } = parseTableDataSafely(children);

  // 空数据处理
  if (headers.length === 0 || rows.length === 0) {
    return (
      <div className="w-full my-4">
        <Table aria-label="Empty table">
          <TableHeader>
            <TableColumn>No Data</TableColumn>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>No data available</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  // 分页逻辑
  const [page, setPage] = React.useState(1);
  const rowsPerPage = 10;

  const pages = Math.ceil(rows.length / rowsPerPage);
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const currentRows = rows.slice(start, end);

  return (
    <div className="w-full">
      <Table
        className="my-4 overflow-y-scroll w-full"
        isStriped
      >
        <TableHeader>
          {headers.map((header, index) => (
            <TableColumn key={`header-${index}`}>{header}</TableColumn>
          ))}
        </TableHeader>
        <TableBody>
          {currentRows.map((row, rowIndex) => (
            <TableRow key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <TableCell key={`cell-${rowIndex}-${cellIndex}`}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pages > 1 && (
        <div className="flex justify-center my-4">
          <Pagination
            total={pages}
            page={page}
            onChange={setPage}
          />
        </div>
      )}
    </div>
  );
};
