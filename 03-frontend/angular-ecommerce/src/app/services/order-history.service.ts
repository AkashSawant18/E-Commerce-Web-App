import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { OrderHistory } from '../common/order-history';

@Injectable({
  providedIn: 'root'
})
export class OrderHistoryService {

  private orderUrl = "http://localhost:8082/api/orders";

  constructor(private httpClient : HttpClient) { }

  getOrderHistory(theEmail: string): Observable<GetResponseOrderhistory> {

    //need to build urlbased on customer email
    const OrderHistoryUrl = `${this.orderUrl}/search/findByCustomerEmailOrderByDateCreatedDesc?email=${theEmail}`;
    return this.httpClient.get<GetResponseOrderhistory>(OrderHistoryUrl);
  }

}

interface GetResponseOrderhistory {
  _embedded:{
    orders: OrderHistory[];
  }
}