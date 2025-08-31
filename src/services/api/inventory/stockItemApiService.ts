// Stock Item API Service for Tally Integration
import BaseApiService from '../baseApiService';

export interface TallyStockItem {
  guid: string;
  name: string;
  alias?: string;
  parent?: string;
  category?: string;
  stockUOM?: string;
  salesPrice?: number;
  purchasePrice?: number;
  mrp?: number;
  openingBalance?: number;
  openingValue?: number;
  costingMethod?: string;
  gstApplicable?: string;
  gstHsnCode?: string;
  taxType?: string;
  [key: string]: any;
}

export class StockItemApiService extends BaseApiService {
  
  public async getStockItems(companyName: string, limit?: number): Promise<TallyStockItem[]> {
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>Stock Items Collection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="Stock Items Collection" ISMODIFY="No">
            <TYPE>StockItem</TYPE>
            <FETCH>GUID, Name, Alias, Parent, Category, StockUOM, SalesPrice, PurchasePrice, MRP, OpeningBalance, OpeningValue, CostingMethod, GSTApplicable, GSTHSNCode, TaxType</FETCH>
            ${limit ? `<MAXITEMS>${limit}</MAXITEMS>` : ''}
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const xmlText = await this.makeRequest(xmlRequest);
      const xmlDoc = this.parseXML(xmlText);
      
      const stockItems: TallyStockItem[] = [];
      const stockItemElements = xmlDoc.querySelectorAll('STOCKITEM');
      
      stockItemElements.forEach(element => {
        try {
          const item = this.parseStockItemElement(element);
          if (item.guid && item.name) {
            stockItems.push(item);
          }
        } catch (error) {
          console.error('Error parsing stock item:', error);
        }
      });

      // If no items found with STOCKITEM selector, try alternative selectors
      if (stockItems.length === 0) {
        const alternativeElements = xmlDoc.querySelectorAll('DATA COLLECTION > *') || 
                                   xmlDoc.querySelectorAll('TALLYMESSAGE > *');
        
        alternativeElements.forEach(element => {
          try {
            if (element.nodeName !== 'STOCKITEM' && element.querySelector('NAME')) {
              const item = this.parseStockItemElement(element);
              if (item.guid && item.name) {
                stockItems.push(item);
              }
            }
          } catch (error) {
            console.error('Error parsing alternative stock item:', error);
          }
        });
      }

      return stockItems;
      
    } catch (error) {
      console.error('Failed to fetch stock items:', error);
      throw error;
    }
  }

  public async getStockItemDetails(companyName: string, itemName: string): Promise<TallyStockItem | null> {
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>OBJECT</TYPE>
    <SUBTYPE>StockItem</SUBTYPE>
    <ID TYPE="Name">${itemName}</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <FETCHLIST>
        <FETCH>*</FETCH>
      </FETCHLIST>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const xmlText = await this.makeRequest(xmlRequest);
      const xmlDoc = this.parseXML(xmlText);
      
      const stockItemElement = xmlDoc.querySelector('STOCKITEM') || 
                              xmlDoc.querySelector('TALLYMESSAGE > *');
      
      if (!stockItemElement) {
        return null;
      }

      return this.parseStockItemElement(stockItemElement);
      
    } catch (error) {
      console.error('Failed to fetch stock item details:', error);
      throw error;
    }
  }

  private parseStockItemElement(element: Element): TallyStockItem {
    const getElementText = (selector: string): string => {
      const el = element.querySelector(selector);
      return el?.textContent?.trim() || '';
    };

    const getElementNumber = (selector: string): number => {
      const text = getElementText(selector);
      return this.parseAmount(text);
    };

    const item: TallyStockItem = {
      guid: getElementText('GUID') || element.getAttribute('GUID') || '',
      name: getElementText('NAME') || element.getAttribute('NAME') || '',
      alias: getElementText('ALIAS'),
      parent: getElementText('PARENT'),
      category: getElementText('CATEGORY'),
      stockUOM: getElementText('STOCKUOM') || getElementText('BASEUNITOFMEASUREMENT'),
      salesPrice: getElementNumber('SALESPRICE') || getElementNumber('BASICSALESPRICE'),
      purchasePrice: getElementNumber('PURCHASEPRICE') || getElementNumber('BASICPURCHASEPRICE'),
      mrp: getElementNumber('MRP'),
      openingBalance: getElementNumber('OPENINGBALANCE'),
      openingValue: getElementNumber('OPENINGVALUE'),
      costingMethod: getElementText('COSTINGMETHOD'),
      gstApplicable: getElementText('GSTAPPLICABLE'),
      gstHsnCode: getElementText('GSTHSNCODE'),
      taxType: getElementText('TAXTYPE')
    };

    // Add all other available fields dynamically
    Array.from(element.children).forEach(child => {
      const fieldName = child.nodeName.toLowerCase();
      const value = child.textContent?.trim();
      
      if (value && !item.hasOwnProperty(fieldName)) {
        // Try to parse as number if it looks like a number
        if (/^-?\d+\.?\d*$/.test(value)) {
          (item as any)[fieldName] = parseFloat(value);
        } else {
          (item as any)[fieldName] = value;
        }
      }
    });

    return item;
  }

  public async getAvailableFields(companyName: string): Promise<string[]> {
    try {
      // Get a few stock items to analyze available fields
      const stockItems = await this.getStockItems(companyName, 5);
      
      if (stockItems.length === 0) {
        return [];
      }

      // Collect all unique field names
      const fields = new Set<string>();
      
      stockItems.forEach(item => {
        Object.keys(item).forEach(key => {
          fields.add(key.toUpperCase());
        });
      });

      return Array.from(fields).sort();
      
    } catch (error) {
      console.error('Failed to get available fields:', error);
      return [];
    }
  }
}