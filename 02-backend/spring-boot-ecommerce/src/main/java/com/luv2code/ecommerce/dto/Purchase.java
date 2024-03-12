package com.luv2code.ecommerce.dto;

import java.util.Set;

import com.luv2code.ecommerce.entity.*;

import lombok.Data;

@Data
public class Purchase {
	
	private Customer customer;
	
	private Address shippingAddress;
	
	private Address billingAddress;
	
	private Order Order;
	
	private Set<OrderItem> orderItems;
}
